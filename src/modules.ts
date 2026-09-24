import { $ } from "bun";
import { remoteMkdir, rsyncTo, sshRun } from "./ssh.ts";

export interface ModuleAudit {
  module: string;
  path: string;
  local: "present" | "missing";
  remote: "present" | "missing";
}

export interface RemoteAudit {
  host: string;
  user: string;
  paths: Record<string, boolean>;
  skillsCount: number;
  tools: Record<string, boolean>;
}

/** Paths remotos que cada módulo gestiona. */
export const MODULE_PATHS: Record<string, string[]> = {
  nvim: ["~/.config/nvim/init.lua", "~/.config/nvim/lua"],
  skills: ["~/.agents/skills"],
  opencode: ["~/.config/opencode/opencode.json", "~/.config/opencode/agents", "~/.config/opencode/commands"],
  pi: ["~/.pi/agent/settings.json"],
  omp: ["~/.omp/agent/config.yml"],
  shell: ["~/.zshenv"],
};

export const TOOLS = ["git", "bun", "omp", "herdr", "gh", "zsh", "nvim"] as const;

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const REMOTE_SCRIPT = `
set -u
echo "host=$(hostname) user=$(whoami)"
for p in __PATHS__; do
  eval "expanded=$p"
  if [ -e "$expanded" ]; then echo "EXISTS $p"; else echo "MISSING $p"; fi
done
echo "skills-count=$(ls ~/.agents/skills 2>/dev/null | wc -l)"
for t in __TOOLS__; do
  command -v "$t" >/dev/null 2>&1 && echo "tool=$t installed" || echo "tool=$t missing"
done
`;

/** Chequeos locales: ¿qué tengo en la workstation? */
export async function auditLocal(): Promise<{ skills: number; factoryBroken: number; opencodeAgents: number }> {
  const home = process.env.HOME ?? "~";
  const lsCount = async (dir: string) => {
    const proc = Bun.spawn(["ls", dir], { stdout: "pipe", stderr: "ignore" });
    const out = await new Response(proc.stdout).text();
    await proc.exited;
    return out.split("\n").filter(Boolean).length;
  };
  const skills = await lsCount(`${home}/.agents/skills`);
  const opencodeAgents = await lsCount(`${home}/.config/opencode/agents`);
  const broken = Bun.spawn(["find", `${home}/.factory/skills`, "-xtype", "l"], {
    stdout: "pipe",
    stderr: "ignore",
  });
  const brokenOut = await new Response(broken.stdout).text();
  await broken.exited;
  return { skills, factoryBroken: brokenOut.split("\n").filter(Boolean).length, opencodeAgents };
}

/** Auditoría remota read-only. */
export async function auditRemote(target: string): Promise<RemoteAudit> {
  const allPaths = Object.values(MODULE_PATHS).flat();
  // paths entre comillas simples: ~ NO se expande en el for, $p queda literal
  // y solo se expande dentro del eval; el echo reporta la clave literal.
  const quoted = allPaths.map((p) => `'${p}'`).join(" ");
  const script = REMOTE_SCRIPT.replace("__PATHS__", quoted).replace(
    "__TOOLS__",
    [...TOOLS].join(" "),
  );
  const res = await sshRun(target, script);
  if (res.exitCode !== 0) throw new Error(`SSH audit falló (${target}): ${res.stderr.trim()}`);
  const paths: Record<string, boolean> = {};
  const tools: Record<string, boolean> = {};
  let host = "?",
    user = "?",
    skillsCount = 0;
  for (const line of res.stdout.split("\n")) {
    const h = line.match(/^host=(\S+) user=(\S+)/);
    if (h) {
      host = h[1];
      user = h[2];
      continue;
    }
    const e = line.match(/^(EXISTS|MISSING) (\S+)/);
    if (e) {
      paths[e[2]] = e[1] === "EXISTS";
      continue;
    }
    const s = line.match(/^skills-count=(\d+)/);
    if (s) {
      skillsCount = Number(s[1]);
      continue;
    }
    const t = line.match(/^tool=(\S+) (installed|missing)/);
    if (t) tools[t[1]] = t[2] === "installed";
  }
  return { host, user, paths, skillsCount, tools };
}

export type SyncModule = keyof typeof MODULE_PATHS | "all";

/** Empuja módulos locales → remoto. NUNCA sincroniza secretos. */
export async function syncTo(target: string, modules: string[]): Promise<void> {
  for (const m of modules) {
    switch (m) {
      case "nvim":
        await remoteMkdir(target, "~/.config/nvim/lua");
        await rsyncTo(`${ROOT}/nvim/init.lua`, target, "~/.config/nvim/init.lua");
        await rsyncTo(`${ROOT}/nvim/lua/`, target, "~/.config/nvim/lua/");
        break;
      case "skills":
        // canon: skills/ del repo (versionado). Meta local no se empuja.
        await remoteMkdir(target, "~/.agents/skills");
        await rsyncTo(`${ROOT}/skills/`, target, "~/.agents/skills/", {
          del: true,
          excludes: [".skill-lock.json", "canonical-list.txt"],
        });
        break;
      case "opencode":
        await remoteMkdir(target, "~/.config/opencode");
        await rsyncTo(`${ROOT}/opencode/agents/`, target, "~/.config/opencode/agents/");
        await rsyncTo(`${ROOT}/opencode/commands/`, target, "~/.config/opencode/commands/");
        console.log("  (opencode.json NO se copia: revisar opencode.json.safe a mano)");
        break;
      case "pi":
        await remoteMkdir(target, "~/.pi/agent");
        await rsyncTo(`${ROOT}/pi/settings.json`, target, "~/.pi/agent/settings.json");
        console.log("  (auth.json NUNCA se sincroniza: re-autenticar en el VPS)");
        break;
      case "omp":
        console.log("  omp es safe-only: aplicar omp/config.safe.yml a mano.");
        console.log(
          `  broker.env por stdin: cat ~/.config/omp/broker.env | ssh ${target} 'cat > ~/.config/omp/broker.env && chmod 600 ~/.config/omp/broker.env'`,
        );
        break;
      case "shell":
        await rsyncTo(`${ROOT}/shell/.zshenv`, target, "~/.zshenv");
        console.log("  (.zshrc/.bashrc solo como .safe: aplicar a mano si se desea)");
        break;
      default:
        throw new Error(`Módulo desconocido: ${m} (nvim|skills|opencode|pi|omp|shell)`);
    }
    console.log(`  ✓ ${m}`);
  }
}

/** Herramientas base faltantes en Debian/Ubuntu (pide sudo remoto). */
export async function installTools(target: string): Promise<void> {
  await $`ssh -t ${target} ${"sudo apt-get update && sudo apt-get install -y git zsh curl ca-certificates unzip neovim gh && (command -v bun >/dev/null || curl -fsSL https://bun.sh/install | bash)"}`.quiet();
}
