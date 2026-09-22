import { parse } from "yaml";

/** Transporte ordenado: la VPN (tailscale) siempre primero. */
export type Via = "tailscale" | "alias" | "public";

export interface Device {
  name: string;
  /** true = esta máquina; sin transportes remotos */
  local?: boolean;
  hostname?: string;
  user?: string;
  os?: string;
  role?: string;
  status?: string;
  tailscale_ip?: string;
  tailscale_name?: string;
  ssh_alias?: string;
  public_ip?: string;
  /** preferencia de transporte; default: tailscale → alias → public */
  via?: Via[];
}

export interface Connection {
  via: Via;
  /** lo que se pasa a `ssh`/`rsync` */
  target: string;
  /** etiqueta legible para logs */
  label: string;
}

const DEFAULT_VIA: Via[] = ["tailscale", "alias", "public"];

const INVENTORY = new URL("../inventory/devices.yml", import.meta.url);

export async function loadDevices(): Promise<Device[]> {
  const raw = await Bun.file(INVENTORY).text();
  const doc = parse(raw) as { devices?: Device[] };
  return doc.devices ?? [];
}

/** nombre, alias, IP tailscale/pública o hostname del tailnet → perfil. */
export async function resolveDevice(ref: string): Promise<Device> {
  const devices = await loadDevices();
  const found = devices.find(
    (d) =>
      d.name === ref ||
      d.ssh_alias === ref ||
      d.tailscale_ip === ref ||
      d.tailscale_name === ref ||
      d.hostname === ref ||
      d.public_ip === ref,
  );
  if (!found) {
    throw new Error(
      `Perfil "${ref}" no existe en inventory/devices.yml (${devices.map((d) => d.name).join(", ")})`,
    );
  }
  return found;
}

/** Conexiones candidatas en orden de preferencia. Vacío si es la máquina local. */
export function connectionsFor(d: Device, onlyVia?: Via): Connection[] {
  if (d.local) return [];
  const user = d.user ?? "root";
  const out: Connection[] = [];
  for (const via of d.via ?? DEFAULT_VIA) {
    if (onlyVia && via !== onlyVia) continue;
    if (via === "tailscale" && d.tailscale_ip) {
      out.push({ via, target: `${user}@${d.tailscale_ip}`, label: d.tailscale_name ?? d.tailscale_ip });
    } else if (via === "alias" && d.ssh_alias) {
      out.push({ via, target: d.ssh_alias, label: d.ssh_alias });
    } else if (via === "public" && d.public_ip) {
      const host = d.public_ip.includes("@") ? d.public_ip : `${user}@${d.public_ip}`;
      out.push({ via, target: host, label: d.public_ip });
    }
  }
  return out;
}

/** Primer transporte disponible (compat: lo que antes devolvía el alias). */
export function sshTargetOf(d: Device, onlyVia?: Via): string {
  const [first] = connectionsFor(d, onlyVia);
  if (!first) {
    if (d.local) throw new Error(`"${d.name}" es la máquina local: sin SSH`);
    throw new Error(`Perfil "${d.name}" sin transportes${onlyVia ? ` (via=${onlyVia})` : ""}`);
  }
  return first.target;
}
