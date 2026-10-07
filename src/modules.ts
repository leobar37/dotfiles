import { $ } from "bun";
import { Database } from "bun:sqlite";
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
  pi: ["~/.pi/agent/settings.json", "~/.pi/agent/extensions/herdr-tools.ts"],
  omp: ["~/.omp/agent/config.yml", "~/.omp/agent/extensions/herdr-tools.ts"],
  shell: ["~/.zshenv", "~/.zshrc"],
  climier: ["~/code/climier-stable/bin/climier.mjs", "~/.local/bin/climier", "~/.climier/projects"],
};

export const TOOLS = ["git", "bun", "omp", "herdr", "gh", "zsh", "nvim", "climier"] as const;

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

export interface ProviderEntry {
  provider: string;
  models: string[];
}

export interface ModelCatalog {
  omp: { provider: string; authenticated: boolean }[];
  opencode: ProviderEntry[];
  pi: ProviderEntry[];
}

type JsonObj = Record<string, unknown>;

function isObj(v: unknown): v is JsonObj {
  return typeof v === "object" && v !== null;
}

function strField(o: unknown, key: string): string | undefined {
  if (!isObj(o)) return undefined;
  const v = o[key];
  return typeof v === "string" ? v : undefined;
}

function modelIds(v: unknown): string[] {
  if (!isObj(v) || !Array.isArray(v.models)) return [];
  const ids: string[] = [];
  for (const m of v.models) {
    const id = strField(m, "id");
    if (id) ids.push(id);
  }
  return ids;
}

/** Catálogo sin secretos: ids de providers/modelos y estado de auth. */
export async function buildCatalog(): Promise<ModelCatalog> {
  const home = process.env.HOME ?? "";
  const omp: ModelCatalog["omp"] = [];
  try {
    const mdb = new Database(`${home}/.omp/agent/models.db`, { readonly: true });
    const adb = new Database(`${home}/.omp/agent/agent.db`, { readonly: true });
    const cached = mdb.query("SELECT provider_id AS id FROM model_cache ORDER BY provider_id").all() as {
      id: string;
    }[];
    const rows = adb.query("SELECT provider AS id FROM auth_credentials WHERE disabled_cause IS NULL").all() as {
      id: string;
    }[];
    const authed = new Set(rows.map((r) => r.id));
    const isAuthed = (cachedId: string): boolean =>
      authed.has(cachedId) || [...authed].some((p) => cachedId.startsWith(`${p}:`));
    for (const r of cached) omp.push({ provider: r.id, authenticated: isAuthed(r.id) });
    for (const p of authed) {
      const covered = omp.some((o) => o.provider === p || o.provider.startsWith(`${p}:`));
      if (!covered) omp.push({ provider: p, authenticated: true });
    }
    mdb.close();
    adb.close();
  } catch {
    /* omp ausente: catálogo vacío */
  }
  const readJson = async (path: string): Promise<JsonObj | null> => {
    try {
      const parsed: unknown = JSON.parse(await Bun.file(path).text());
      return isObj(parsed) ? parsed : null;
    } catch {
      return null;
    }
  };
  const opencode: ProviderEntry[] = [];
  const oc = await readJson(`${home}/.config/opencode/opencode.json`);
  const ocProviders = oc && (isObj(oc.providers) ? oc.providers : isObj(oc.provider) ? oc.provider : null);
  if (ocProviders) {
    for (const [k, v] of Object.entries(ocProviders)) {
      opencode.push({ provider: k, models: isObj(v) && isObj(v.models) ? Object.keys(v.models) : [] });
    }
  }
  const pi: ProviderEntry[] = [];
  const pm = await readJson(`${home}/.pi/agent/models.json`);
  if (pm && isObj(pm.providers)) {
    for (const [k, v] of Object.entries(pm.providers)) {
      pi.push({ provider: k, models: modelIds(v) });
    }
  }
  return { omp, opencode, pi };
}

/** Persiste catalog.json + snapshot sanitizado de pi (keys enmascaradas). */
export async function writeCatalogFiles(c: ModelCatalog): Promise<void> {
  const home = process.env.HOME ?? "";
  await Bun.write(`${ROOT}/omp/catalog.json`, JSON.stringify(c, null, 2));
  try {
    const parsed: unknown = JSON.parse(await Bun.file(`${home}/.pi/agent/models.json`).text());
    if (isObj(parsed) && isObj(parsed.providers)) {
      for (const p of Object.values(parsed.providers)) {
        if (isObj(p) && "apiKey" in p) p.apiKey = "***";
      }
      await Bun.write(`${ROOT}/pi/models.safe.json`, JSON.stringify(parsed, null, 2));
    }
  } catch {
    /* pi ausente: sin snapshot */
  }
}
export type SyncModule = keyof typeof MODULE_PATHS | "all";

/** mkdir remoto, o solo log en dry-run. */
async function ensureDir(target: string, dir: string, dry?: boolean): Promise<void> {
  if (dry) {
    console.log(`  (dry) mkdir ${dir} en ${target}`);
    return;
  }
  await remoteMkdir(target, dir);
}
/** Empuja módulos locales → remoto. NUNCA sincroniza secretos. */
export async function syncTo(target: string, modules: string[], opts: { dry?: boolean } = {}): Promise<void> {
  for (const m of modules) {
    switch (m) {
      case "nvim":
        await ensureDir(target, "~/.config/nvim/lua", opts.dry);
        await rsyncTo(`${ROOT}/nvim/init.lua`, target, "~/.config/nvim/init.lua", { dry: opts.dry });
        await rsyncTo(`${ROOT}/nvim/lua/`, target, "~/.config/nvim/lua/", { dry: opts.dry });
        break;
      case "skills":
        // canon: skills/ del repo (versionado). Meta local no se empuja.
        await ensureDir(target, "~/.agents/skills", opts.dry);
        await rsyncTo(`${ROOT}/skills/`, target, "~/.agents/skills/", {
          del: true,
          dry: opts.dry,
          excludes: [".skill-lock.json", "canonical-list.txt"],
        });
        break;
      case "opencode":
        await ensureDir(target, "~/.config/opencode", opts.dry);
        await rsyncTo(`${ROOT}/opencode/agents/`, target, "~/.config/opencode/agents/", { dry: opts.dry });
        await rsyncTo(`${ROOT}/opencode/commands/`, target, "~/.config/opencode/commands/", { dry: opts.dry });
        // opencode.json es libre de secretos (apiKey de muse-code vive en auth.json): se empuja verbatim.
        if (!opts.dry) {
          const backup = await sshRun(target, `test -f ~/.config/opencode/opencode.json && cp ~/.config/opencode/opencode.json ~/.config/opencode/opencode.json.bak.$(date +%Y%m%d-%H%M%S) && echo backed-up || echo sin-previo`);
          console.log(`  (opencode remoto: ${backup.stdout.trim()})`);
        }
        await rsyncTo(`${ROOT}/opencode/opencode.json`, target, "~/.config/opencode/opencode.json", { dry: opts.dry });
        break;
      case "pi":
        await ensureDir(target, "~/.pi/agent", opts.dry);
        await rsyncTo(`${ROOT}/pi/settings.json`, target, "~/.pi/agent/settings.json", { dry: opts.dry });
        if (!opts.dry) {
          // pi auto-instala packages con npm -g: el prefix debe ser del usuario,
          // nunca /usr (EACCES). Guardia idempotente.
          const guard = await sshRun(
            target,
            `command -v npm >/dev/null 2>&1 || { echo sin-npm; exit 0; }\ncase "$(npm config get prefix 2>/dev/null)" in "$HOME"/*) echo prefix-ok;; *) mkdir -p ~/.npm-global && npm config set prefix ~/.npm-global && echo prefix-reparado;; esac`,
          );
          console.log(`  (pi remoto: ${guard.stdout.trim()})`);
        }
        // Extensiones compartidas pi/omp (misma API): fuente única en omp/extensions.
        await ensureDir(target, "~/.pi/agent/extensions", opts.dry);
        await rsyncTo(`${ROOT}/omp/extensions/`, target, "~/.pi/agent/extensions/", { dry: opts.dry });
        console.log("  (auth.json NUNCA se sincroniza: re-autenticar en el VPS)");
        break;
      case "omp": {
        // Solo prefs versionadas (config/modelos/SYSTEM). NUNCA db, tokens ni broker.env.
        if (!opts.dry) {
          const backup = await sshRun(target, `test -f ~/.omp/agent/config.yml && cp ~/.omp/agent/config.yml ~/.omp/agent/config.yml.bak.$(date +%Y%m%d-%H%M%S) && echo backed-up || echo no-previo`);
          console.log(`  (omp remoto: ${backup.stdout.trim()})`);
        }
        await ensureDir(target, "~/.omp/agent", opts.dry);
        await rsyncTo(`${ROOT}/omp/config.safe.yml`, target, "~/.omp/agent/config.yml", { dry: opts.dry });
        await rsyncTo(`${ROOT}/omp/models.yml`, target, "~/.omp/agent/models.yml", { dry: opts.dry });
        await rsyncTo(`${ROOT}/omp/SYSTEM.md`, target, "~/.omp/agent/SYSTEM.md", { dry: opts.dry });
        // Extensiones versionadas; sin --delete para no tocar las que instala herdr.
        await ensureDir(target, "~/.omp/agent/extensions", opts.dry);
        await rsyncTo(`${ROOT}/omp/extensions/`, target, "~/.omp/agent/extensions/", { dry: opts.dry });
        console.log("  (broker.env y auth: manual por stdin, nunca via git)");
        break;
      }
      case "shell": {
        await rsyncTo(`${ROOT}/shell/.zshenv`, target, "~/.zshenv", { dry: opts.dry });
        // .zshrc.safe es libre de secretos (verificado en review): se empuja verbatim.
        // Solo respalda el remoto si existe y difiere (syncs idempotentes no spamean .bak).
        if (!opts.dry) {
          const localHash = (await $`sha256sum ${ROOT}/shell/.zshrc.safe | cut -d' ' -f1`.text()).trim();
          const remote = await sshRun(target, `sha256sum ~/.zshrc 2>/dev/null | cut -d' ' -f1 || echo sin-previo`);
          const remoteHash = remote.stdout.trim();
          if (remoteHash !== "sin-previo" && remoteHash !== localHash) {
            const backup = await sshRun(target, `cp ~/.zshrc ~/.zshrc.bak.$(date +%Y%m%d-%H%M%S) && echo backed-up`);
            console.log(`  (zshrc remoto: ${backup.stdout.trim()})`);
          } else {
            console.log(`  (zshrc remoto: ${remoteHash === "sin-previo" ? "sin-previo" : "sin-cambios"})`);
          }
        }
        await rsyncTo(`${ROOT}/shell/.zshrc.safe`, target, "~/.zshrc", { dry: opts.dry });
        console.log("  (.bashrc solo como .safe: aplicar a mano si se desea)");
        break;
      }
      case "climier": {
        // Tool: espejo del árbol 2.0.0 (rama local climier-2.0.0) sin .git/node_modules.
        // Requiere bun en el remoto (install-tools.sh o ~/.bun ya instalado).
        const home = process.env.HOME ?? "";
        if (opts.dry) {
          console.log(`  (dry) mkdirs + rsync ~/code/climier → ~/code/climier-stable (sin .git/node_modules/web/.climier.json)`);
          console.log(`  (dry) wrapper ~/.local/bin/climier (bin/climier.ts) + estado ~/.climier/projects`);
          console.log(`  (dry) migrate --all remoto (estado legacy → canonical v1)`);
          break;
        }
        await ensureDir(target, "~/code/climier-stable", opts.dry);
        await ensureDir(target, "~/.local/bin", opts.dry);
        await ensureDir(target, "~/.climier/projects", opts.dry);
        await rsyncTo(`${home}/code/climier/`, target, "~/code/climier-stable/", {
          del: true,
          dry: opts.dry,
          excludes: [".git/", "node_modules/", "web/", ".plans/", ".climier.json"],
        });
        const wrapper = `#!/bin/sh\nexport PATH="$HOME/.bun/bin:$PATH"\nexec "$HOME/code/climier-stable/bin/climier.ts" "$@"\n`;
        await sshRun(
          target,
          `cat > ~/.local/bin/climier <<'WRAP'\n${wrapper}WRAP\nchmod +x ~/.local/bin/climier\n` +
            // Backend local en el espejo: el .climier.json del workstation apunta a un
            // backend remote y bloquearía dispatch/migrate en el remoto.
            `cat > ~/code/climier-stable/.climier.json <<'META'\n{\n  "version": 1,\n  "project_id": "b4e2c579bbb81669"\n}\nMETA\n` +
            `chmod +x ~/code/climier-stable/bin/climier.ts`,
        );
        await rsyncTo(`${home}/.climier/projects/`, target, "~/.climier/projects/", { dry: opts.dry });
        // El binario 2.0.0 no lee estado legacy (v2-v5): migrar lo que quede en el remoto.
        const mig = await sshRun(
          target,
          `cd ~/code/climier-stable && "$HOME/code/climier-stable/bin/climier.ts" migrate --all >/dev/null 2>&1 && echo ok || echo SKIP`,
        );
        console.log(`  (migrate remoto: ${mig.stdout.trim() || "sin salida"})`);
        console.log("  (estado DAG: workstation manda; ediciones remotas se pisan)");
        break;
      }
      default:
        throw new Error(`Módulo desconocido: ${m} (nvim|skills|opencode|pi|omp|shell|climier)`);
    }
    console.log(`  ✓ ${m}`);
  }
}

/** Herramientas base faltantes en Debian/Ubuntu (pide sudo remoto). */
export async function installTools(target: string): Promise<void> {
  await $`ssh -t ${target} ${"sudo apt-get update && sudo apt-get install -y git zsh curl ca-certificates unzip neovim gh && (command -v bun >/dev/null || curl -fsSL https://bun.sh/install | bash)"}`.quiet();
}
