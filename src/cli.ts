#!/usr/bin/env bun
/** dotfiles cli — perfiles, audit, sync y exec contra los VPS del inventario. */
import { MODULE_PATHS, TOOLS, auditLocal, auditRemote, buildCatalog, syncTo, writeCatalogFiles } from "./modules.ts";
import { connectionsFor, loadDevices, resolveDevice, type Via } from "./inventory.ts";

import { pickConnection, sshRunFallback } from "./ssh.ts";
import { tailnetPeers } from "./tailnet.ts";

const [, , cmd, ...rest] = process.argv;
const args = [...rest];

/** Extrae `--via <t|a|p>` de los args (acepta nombre completo o letra). */
function takeVia(): Via | undefined {
  const i = args.indexOf("--via");
  if (i === -1) return undefined;
  const raw = args.splice(i, 2)[1] ?? "";
  const short: Record<string, Via> = {
    t: "tailscale",
    tailscale: "tailscale",
    a: "alias",
    alias: "alias",
    p: "public",
    public: "public",
  };
  const via = short[raw];
  if (!via) throw new Error(`--via inválido: "${raw}" (tailscale|alias|public)`);
  return via;
}

function help(): void {
  console.log(`uso:
  bun src/cli.ts profiles                 perfiles + transportes + estado tailnet
  bun src/cli.ts inventory                lista compacta de dispositivos
  bun src/cli.ts audit [perfil] [--via T] auditoría read-only (default: vultr-dev)
  bun src/cli.ts models                            catálogo omp→opencode/pi (escribe catalog.json)
  bun src/cli.ts exec <perfil> [--via T] -- <cmd>  comando remoto vía ssh-runner`);
}

/** Flag --dry-run: muestra sin transferir (rsync -n, sin mkdir). */
function takeDry(): boolean {
  const i = args.indexOf("--dry-run");
  if (i === -1) return false;
  args.splice(i, 1);
  return true;
}

const STATUS_ICON: Record<string, string> = { ok: "✓", drift: "≠", vacio: "~", "no-auditado": "·", "blocked-timeout": "✕" };

switch (cmd) {
  case "profiles": {
    const peers = await tailnetPeers();
    for (const d of await loadDevices()) {
      console.log(`${STATUS_ICON[d.status ?? ""] ?? "·"} ${d.name}  ${d.user ?? "?"}  [${d.role ?? ""}/${d.status ?? "?"}]`);
      if (d.local) {
        console.log(`   local · ${(d.tailscale_ip && peers[d.tailscale_ip]) ? "tailnet ok" : ""}`);
        continue;
      }
      for (const c of connectionsFor(d)) {
        const peer = d.tailscale_ip ? peers[d.tailscale_ip] : undefined;
        const state =
          c.via === "tailscale" ? (peer ? (peer.online ? "online" : "offline") : "desconocido") : "—";
        console.log(`   ${c.via.padEnd(9)} ${c.target}  (${c.label})  ${state}`);
      }
    }
    break;
  }
  case "inventory": {
    for (const d of await loadDevices()) {
      const via = d.local ? "local" : connectionsFor(d).map((c) => c.via[0]).join("/");
      console.log(
        `${STATUS_ICON[d.status ?? ""] ?? "·"} ${d.name}  ${d.user ?? "?"}  via:${via}  ${d.os ?? ""}  [${d.role ?? ""}]`,
      );
    }
    break;
  }
  case "audit": {
    const via = takeVia();
    const device = await resolveDevice(args[0] ?? "vultr-dev");
    const conns = connectionsFor(device, via);
    if (conns.length === 0) throw new Error(`Perfil "${device.name}" sin transportes para via=${via ?? "default"}`);
    const local = await auditLocal();
    console.log(`-- local: ${local.skills} skills, ${local.factoryBroken} factory-symlinks rotos, ${local.opencodeAgents} opencode-agents`);
    // auditRemote usa el primer transporte; el fallback se negocia aquí:
    let target = conns[0].target;
    let usedVia = conns[0].via;
    if (conns.length > 1) {
      const picked = await pickConnection(conns);
      target = picked.target;
      usedVia = picked.via;
    }
    const remote = await auditRemote(target);
    console.log(`-- ${device.name} via=${usedVia} (${remote.host}, ${remote.user}): ${remote.skillsCount} skills`);
    for (const [mod, paths] of Object.entries(MODULE_PATHS)) {
      const missing = paths.filter((p) => !remote.paths[p]);
      console.log(`   ${missing.length === 0 ? "✓" : "≠"} ${mod}${missing.length ? `: falta ${missing.join(", ")}` : ""}`);
    }
    const missingTools = [...TOOLS].filter((t) => !remote.tools[t]);
    console.log(`   tools faltantes: ${missingTools.join(", ") || "ninguna"}`);
    break;
  }
  case "sync": {
    const via = takeVia();
    const dry = takeDry();
    const ref = args[0];
    const modules = args[1] ? args.slice(1) : ["nvim", "skills", "opencode", "pi", "omp", "shell", "climier"];

    const targets =
      ref === "all"
        ? (await loadDevices()).filter((d) => !d.local && d.status !== "blocked-timeout")
        : [await resolveDevice(ref)];
    for (const device of targets) {
      try {
        const picked = await pickConnection(connectionsFor(device, via));
        console.log(`sync → ${device.name} via=${picked.via} (${picked.target}): ${modules.join(", ")}${dry ? " [dry-run]" : ""}`);
        await syncTo(picked.target, modules, { dry });
        console.log(`  OK ${device.name}`);
      } catch (e) {
        console.log(`  FAIL ${device.name}: ${(e as Error).message}`);
      }
    }
    break;
  }
  case "exec": {
    const via = takeVia();
    const sep = args.indexOf("--");
    if (!args[0] || sep === -1) throw new Error("uso: bun src/cli.ts exec <perfil> -- <cmd>");
    const device = await resolveDevice(args[0]);
    const res = await sshRunFallback(connectionsFor(device, via), args.slice(sep + 1).join(" "));
    console.log(`-- via=${res.via} (${res.target})`);
    process.stdout.write(res.stdout);
    process.stderr.write(res.stderr);
    process.exit(res.exitCode);
    break;
  }
  case "models": {
    const c = await buildCatalog();
    const inOpencode = new Set(c.opencode.flatMap((p) => p.models));
    const inPi = new Set(c.pi.flatMap((p) => p.models));
    const authed = c.omp.filter((p) => p.authenticated);
    console.log(`OMP: ${c.omp.length} providers en caché, ${authed.length} autenticados`);
    for (const p of authed) {
      const where = [
        inOpencode.has(p.provider) ? "opencode" : null,
        inPi.has(p.provider) ? "pi" : null,
      ].filter(Boolean);
      console.log(`  ✓ ${p.provider}${where.length ? ` (en ${where.join(", ")})` : ""}`);
    }
    console.log(`opencode providers: ${c.opencode.map((p) => `${p.provider}(${p.models.length})`).join(", ")}`);
    console.log(`pi providers: ${c.pi.map((p) => `${p.provider}(${p.models.length})`).join(", ")}`);
    await writeCatalogFiles(c);
    console.log("  → omp/catalog.json + pi/models.safe.json");
    break;
  }
  default:
    help();
    if (cmd) process.exitCode = 1;
}
