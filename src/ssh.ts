import { $ } from "bun";

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
    ...(opts.excludes?.flatMap((e) => ["--exclude", e]) ?? []),
    localSrc,
    `${target}:${remoteDest}`,
  ];
  await $`${args}`.quiet();
}

/** Crea un directorio en el remoto (mkdir -p). */
export async function remoteMkdir(target: string, dir: string): Promise<ExecResult> {
  return sshRun(target, `mkdir -p ${JSON.stringify(dir)}`);
}
