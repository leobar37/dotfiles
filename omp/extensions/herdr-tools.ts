// herdr-tools.ts — comandos de integración OMP ↔ herdr.
//
// Comandos:
//   /herder-position [json]   Imprime la posición actual dentro de herdr
//                             (pane_id + cwd, o JSON completo con `json`)
//                             y la copia al portapapeles si hay mecanismo
//                             disponible (xclip → wl-copy → OSC52).
//
// Para agregar comandos nuevos: sumar entradas al array COMMANDS al final.
// Why: sin import de tipos de paquete — Pi y OMP exponen la misma API de
// extensiones pero publican los tipos bajo nombres distintos (misma
// convención que orca-agent-status.ts).

import { spawn, type ChildProcess } from "node:child_process";
import { closeSync, openSync, writeSync } from "node:fs";
import { hostname } from "node:os";
const HERDR_BIN = "herdr";
const CLI_TIMEOUT_MS = 3000;

interface HerdrPane {
  pane_id?: string;
  workspace_id?: string;
  tab_id?: string;
  cwd?: string;
  foreground_cwd?: string;
  agent?: string;
  agent_session?: { value?: string };
}

export interface PositionPayload {
  env: "herdr" | "ssh" | "local";
  pane_id: string;
  workspace_id: string;
  tab_id: string;
  host: string;
  cwd: string;
  agent: string;
  session_file: string;
}

interface UIContext {
  ui: { notify: (message: string, type?: string) => void };
}

interface RunResult {
  ok: boolean;
  stdout: string;
  stderr: string;
}

function run(
  cmd: string,
  args: string[],
  input?: string,
  timeoutMs = CLI_TIMEOUT_MS,
): Promise<RunResult> {
  const { promise, resolve } = Promise.withResolvers<RunResult>();
  let child: ChildProcess;
  try {
    child = spawn(cmd, args, { stdio: ["pipe", "pipe", "pipe"] });
  } catch {
    resolve({ ok: false, stdout: "", stderr: "spawn failed" });
    return promise;
  }
  let stdout = "";
  let stderr = "";
  let settled = false;
  const finish = (ok: boolean) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    resolve({ ok, stdout, stderr });
  };
  const timer = setTimeout(() => {
    child.kill("SIGKILL");
    finish(false);
  }, timeoutMs);
  timer.unref?.();
  child.stdout?.on("data", (d) => (stdout += d));
  child.stderr?.on("data", (d) => (stderr += d));
  child.on("error", () => finish(false));
  child.on("close", (code) => finish(code === 0));
  if (input !== undefined) child.stdin?.end(input);
  else child.stdin?.end();
  return promise;
}

/** String no vacío o undefined; valida cada campo leído del JSON del CLI. */
const nonEmpty = (v: unknown): string | undefined =>
  typeof v === "string" && v.length > 0 ? v : undefined;

/** Extrae `.result.pane` del stdout de `herdr pane current` con checks runtime. */
function parsePaneCurrent(stdout: string): HerdrPane | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null || !("result" in parsed)) {
    return null;
  }
  const result: unknown = parsed.result;
  if (typeof result !== "object" || result === null || !("pane" in result)) {
    return null;
  }
  const pane: unknown = result.pane;
  // Cast contenedor: todo objeto JS es Record; el contenido se valida campo
  // a campo con nonEmpty() en currentPosition(), no se confía ciegamente.
  const rec = pane as Record<string, unknown>;
  if (typeof pane !== "object" || pane === null || Array.isArray(pane)) {
    return null;
  }
  const session: unknown = rec.agent_session;
  return {
    pane_id: nonEmpty(rec.pane_id),
    workspace_id: nonEmpty(rec.workspace_id),
    tab_id: nonEmpty(rec.tab_id),
    cwd: nonEmpty(rec.cwd),
    foreground_cwd: nonEmpty(rec.foreground_cwd),
    agent: nonEmpty(rec.agent),
    agent_session:
      typeof session === "object" && session !== null && "value" in session
        ? { value: nonEmpty((session as Record<string, unknown>).value) }
        : undefined,
  };
}

/**
 * Identidad del entorno: pane de herdr (env inyectado), sesión ssh remota
 * (SSH_CONNECTION/SSH_TTY) o shell local. cwd/agente desde el CLI de herdr
 * cuando aplica; si no, process.cwd().
 */
export async function currentPosition(): Promise<PositionPayload> {
  const paneId = process.env.HERDR_PANE_ID ?? "";
  const inHerdr = process.env.HERDR_ENV === "1" && paneId.length > 0;
  const base: PositionPayload = {
    env: inHerdr
      ? "herdr"
      : process.env.SSH_CONNECTION || process.env.SSH_TTY
        ? "ssh"
        : "local",
    pane_id: paneId,
    workspace_id: process.env.HERDR_WORKSPACE_ID ?? "",
    tab_id: process.env.HERDR_TAB_ID ?? "",
    host: hostname().split(".")[0]?.toLowerCase() ?? hostname(),
    cwd: process.cwd(),
    agent: "",
    session_file: "",
  };
  if (!inHerdr) return base;

  const res = await run(HERDR_BIN, ["pane", "current", "--current"]);
  const pane = res.ok ? parsePaneCurrent(res.stdout) : null;
  if (!pane) return base;
  return {
    ...base,
    pane_id: pane.pane_id ?? base.pane_id,
    workspace_id: pane.workspace_id ?? base.workspace_id,
    tab_id: pane.tab_id ?? base.tab_id,
    cwd: pane.cwd ?? pane.foreground_cwd ?? base.cwd,
    agent: pane.agent ?? "",
    session_file: pane.agent_session?.value ?? "",
  };
}

export const compactLine = (p: PositionPayload): string =>
  [
    `env=${p.env}`,
    ...(p.pane_id ? [`pane_id=${p.pane_id}`] : []),
    `host=${p.host}`,
    `cwd=${p.cwd}`,
  ].join(" ");

export const fullJson = (p: PositionPayload): string =>
  JSON.stringify(
    {
      env: p.env,
      ...(p.pane_id ? { pane_id: p.pane_id } : {}),
      ...(p.workspace_id ? { workspace_id: p.workspace_id } : {}),
      ...(p.tab_id ? { tab_id: p.tab_id } : {}),
      host: p.host,
      cwd: p.cwd,
      ...(p.agent ? { agent: p.agent } : {}),
      ...(p.session_file ? { session_file: p.session_file } : {}),
    },
    null,
    2,
  );

/** xclip → wl-copy → OSC52 (invisible; lo interpreta la terminal del usuario). */
export async function copyToClipboard(
  text: string,
): Promise<"clipboard" | "osc52" | "none"> {
  if (process.env.DISPLAY) {
    const r = await run("xclip", ["-selection", "clipboard", "-in"], text);
    if (r.ok) return "clipboard";
  }
  if (process.env.WAYLAND_DISPLAY) {
    const r = await run("wl-copy", [], text);
    if (r.ok) return "clipboard";
  }
  try {
    const b64 = Buffer.from(text, "utf8").toString("base64");
    const fd = openSync("/dev/tty", "w");
    try {
      writeSync(fd, `\x1b]52;c;${b64}\x07`);
    } finally {
      closeSync(fd);
    }
    return "osc52";
  } catch {
    return "none";
  }
}

interface HerdrCommand {
  name: string;
  description: string;
  handler: (args: string, ctx: UIContext) => Promise<void> | void;
}

const COMMANDS: HerdrCommand[] = [
  {
    name: "herder-position",
    description:
      "Posición del entorno (herdr/ssh/local): env, pane_id, host, cwd; copia al portapapeles. Args: [json]",
    handler: async (args, ctx) => {
      const pos = await currentPosition();
      const payload = /\bjson\b/i.test(args) ? fullJson(pos) : compactLine(pos);
      const via = await copyToClipboard(payload);
      const suffix =
        via === "clipboard"
          ? "  [copiado]"
          : via === "osc52"
            ? "  [osc52 enviado]"
            : "";
      ctx.ui.notify(payload + suffix, "info");
    },
  },
];

export default function herdrTools(pi: {
  registerCommand: (
    name: string,
    def: { description: string; handler: HerdrCommand["handler"] },
  ) => void;
}): void {
  for (const cmd of COMMANDS) {
    pi.registerCommand(cmd.name, {
      description: cmd.description,
      handler: cmd.handler,
    });
  }
}
