/** Estado del tailnet: quién está online según `tailscale status --json`. */

export interface PeerState {
  name: string;
  online: boolean;
}

interface StatusJson {
  Self?: { HostName?: string; TailscaleIPs?: string[] };
  Peer?: Record<string, { HostName?: string; DNSName?: string; TailscaleIPs?: string[]; Online?: boolean }>;
}

/** Mapa ip → estado, incluyendo esta máquina como Self. */
export async function tailnetPeers(): Promise<Record<string, PeerState>> {
  const proc = Bun.spawn(["tailscale", "status", "--json"], { stdout: "pipe", stderr: "ignore" });
  const out = await new Response(proc.stdout).text();
  if ((await proc.exited) !== 0) return {};
  const states: Record<string, PeerState> = {};
  try {
    const doc = JSON.parse(out) as StatusJson;
    if (doc.Self?.TailscaleIPs?.[0]) {
      states[doc.Self.TailscaleIPs[0]] = { name: doc.Self.HostName ?? "self", online: true };
    }
    for (const peer of Object.values(doc.Peer ?? {})) {
      const ip = peer.TailscaleIPs?.[0];
      if (ip) states[ip] = { name: peer.HostName ?? peer.DNSName ?? ip, online: peer.Online === true };
    }
  } catch {
    return {};
  }
  return states;
}

/** Ping directo por la VPN (best-effort para `profiles`). */
export async function tailscalePing(ip: string, timeoutSec = 2): Promise<boolean> {
  const proc = Bun.spawn(["tailscale", "ping", `--timeout=${timeoutSec}s`, "-c", "1", ip], {
    stdout: "ignore",
    stderr: "ignore",
  });
  return ((await proc.exited) as number) === 0;
}
