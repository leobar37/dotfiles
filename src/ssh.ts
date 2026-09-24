import { $ } from "bun";
import type { Connection, Via } from "./inventory.ts";

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface SshOptions {
  /** segundos para ConnectTimeout (default 8) */
  timeout?: number;
  /** -t para comandos interactivos como apt/sudo */
  tty?: boolean;
  /** BatchMode: falla sin pedir password (default true) */
  batch?: boolean;
}

const COMMON = ["-o", "StrictHostKeyChecking=accept-new"];

/** Ejecuta un script bash en el remoto vía SSH. */
export async function sshRun(target: string, script: string, opts: SshOptions = {}): Promise<ExecResult> {
  const { timeout = 8, tty = false, batch = true } = opts;
  const args = [
    "ssh",
    "-o",
    `ConnectTimeout=${timeout}`,
    ...(batch ? ["-o", "BatchMode=yes"] : []),
    ...COMMON,
    ...(tty ? ["-t"] : []),
    target,
    "bash",
    "-s",
    "--",
  ];
  const proc = Bun.spawn(args, {
    stdin: new Response(script),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { stdout, stderr, exitCode };
}

export interface RsyncOptions {
  del?: boolean;
  excludes?: string[];
  dry?: boolean;
}

/** Empuja una ruta local hacia el remoto con rsync. */
export async function rsyncTo(
  localSrc: string,
  target: string,
  remoteDest: string,
  opts: RsyncOptions = {},
): Promise<void> {
  const args = [
    "rsync",
    "-av",
    ...(opts.del ? ["--delete"] : []),
    ...(opts.dry ? ["-n"] : []),
    ...(opts.excludes?.flatMap((e) => ["--exclude", e]) ?? []),
    localSrc,
    `${target}:${remoteDest}`,
  ];
  if (opts.dry) {
    await $`${args}`;
  } else {
    await $`${args}`.quiet();
  }
}

/** Crea un directorio en el remoto (mkdir -p). */
export async function remoteMkdir(target: string, dir: string): Promise<ExecResult> {
  return sshRun(target, `mkdir -p ${JSON.stringify(dir)}`);
}

export interface RunOutcome extends ExecResult {
  via: Via;
  target: string;
}

/**
 * Prueba conexiones en orden (tailscale → alias → public).
 * Solo reintenta con exit 255 (fallo de transporte SSH); si el comando
 * corrió y falló por sí mismo, devuelve ese resultado sin reintentar.
 */
export async function sshRunFallback(
  conns: Connection[],
  script: string,
  opts: SshOptions = {},
): Promise<RunOutcome> {
  const failures: string[] = [];
  for (const c of conns) {
    const r = await sshRun(c.target, script, opts);
    if (r.exitCode === 0 || r.exitCode !== 255) return { ...r, via: c.via, target: c.target };
    failures.push(`${c.via}(${c.label}): ${r.stderr.trim().split("\n").pop() ?? "ssh 255"}`);
  }
  throw new Error(`Sin conexión [${conns.map((c) => c.via).join("/")}] — ${failures.join(" | ")}`);
}

/** Primer transporte que responde `true`. Para rsync, que no reintenta solo. */
export async function pickConnection(conns: Connection[], opts: SshOptions = {}): Promise<Connection> {
  for (const c of conns) {
    const r = await sshRun(c.target, "true", { ...opts, timeout: opts.timeout ?? 5 });
    if (r.exitCode === 0) return c;
  }
  throw new Error(`Ningún transporte responde: ${conns.map((c) => `${c.via}:${c.label}`).join(", ")}`);
}
