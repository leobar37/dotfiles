import { parse } from "yaml";

export interface Device {
  name: string;
  hostname?: string;
  tailscale_ip?: string;
  ssh_alias?: string;
  ssh?: string;
  user?: string;
  os?: string;
  role?: string;
  status?: string;
}

const INVENTORY = new URL("../inventory/devices.yml", import.meta.url);

export async function loadDevices(): Promise<Device[]> {
  const raw = await Bun.file(INVENTORY).text();
  const doc = parse(raw) as { devices?: Device[] };
  return doc.devices ?? [];
}

/** Resuelve nombre/IP/alias → Device. */
export async function resolveDevice(ref: string): Promise<Device> {
  const devices = await loadDevices();
  const found = devices.find(
    (d) => d.name === ref || d.ssh_alias === ref || d.tailscale_ip === ref || d.hostname === ref,
  );
  if (!found) {
    throw new Error(
      `Target "${ref}" no está en inventory/devices.yml (${devices.map((d) => d.name).join(", ")})`,
    );
  }
  return found;
}

/** Cómo conectarse por SSH: alias > ssh user@host > tailscale_ip. */
export function sshTargetOf(d: Device): string {
  if (d.ssh_alias) return d.ssh_alias;
  if (d.ssh) return d.ssh.includes("@") ? d.ssh : `${d.user ?? "root"}@${d.ssh}`;
  if (d.tailscale_ip) return `${d.user ?? "root"}@${d.tailscale_ip}`;
  throw new Error(`Device "${d.name}" sin ssh_alias/ssh/tailscale_ip`);
}
