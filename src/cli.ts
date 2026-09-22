#!/usr/bin/env bun
/** dotfiles cli — inventory, audit, sync y exec contra los VPS del inventario. */
import { loadDevices, resolveDevice, sshTargetOf } from "./inventory.ts";
import { MODULE_PATHS, TOOLS, auditLocal, auditRemote, syncTo } from "./modules.ts";
import { sshRun } from "./ssh.ts";

const [, , cmd, ...args] = process.argv;

function help(): void {
  console.log(`uso:
  bun src/cli.ts inventory                  lista dispositivos del inventario
  bun src/cli.ts audit [target]             auditoría read-only (default: vultr-dev)
  bun src/cli.ts sync <target> [modulos]    empuja configs (nvim skills opencode pi omp shell)
  bun src/cli.ts exec <target> -- <cmd>     ejecuta comando remoto vía ssh-runner`);
}

const STATUS_ICON: Record<string, string> = { ok: "✓", drift: "≠", missing: "~", blocked: "✕" };

switch (cmd) {
  case "inventory": {
    for (const d of await loadDevices()) {
      console.log(
        `${STATUS_ICON[d.status ?? ""] ?? "·"} ${d.name}  ${d.user ?? "?"}@${d.tailscale_ip ?? d.ssh ?? "?"}  ${d.os ?? ""}  [${d.role ?? ""}/${d.status ?? "?"}]`,
      );
    }
    break;
  }
  case "audit": {
    const ref = args[0] ?? "vultr-dev";
    const device = await resolveDevice(ref);
    const target = sshTargetOf(device);
    const local = await auditLocal();
    console.log(`-- local: ${local.skills} skills, ${local.factoryBroken} factory-symlinks rotos, ${local.opencodeAgents} opencode-agents`);
    const remote = await auditRemote(target);
    console.log(`-- ${device.name} (${remote.host}, ${remote.user}): ${remote.skillsCount} skills`);
    for (const [mod, paths] of Object.entries(MODULE_PATHS)) {
      const missing = paths.filter((p) => !remote.paths[p]);
      console.log(`   ${missing.length === 0 ? "✓" : "≠"} ${mod}${missing.length ? `: falta ${missing.join(", ")}` : ""}`);
    }
    const missingTools = [...TOOLS].filter((t) => !remote.tools[t]);
    console.log(`   tools faltantes: ${missingTools.join(", ") || "ninguna"}`);
    break;
  }
  case "sync": {
    const ref = args[0];
    if (!ref) throw new Error("falta target: bun src/cli.ts sync <target> [modulos]");
    const device = await resolveDevice(ref);
    const target = sshTargetOf(device);
    const modules = args[1] ? args.slice(1) : ["nvim", "skills", "opencode", "pi", "shell"];
    console.log(`sync → ${device.name} (${target}): ${modules.join(", ")}`);
    await syncTo(target, modules);
    console.log("OK");
    break;
  }
  case "exec": {
    const ref = args[0];
    const sep = args.indexOf("--");
    if (!ref || sep === -1) throw new Error("uso: bun src/cli.ts exec <target> -- <cmd>");
    const device = await resolveDevice(ref);
    const res = await sshRun(sshTargetOf(device), args.slice(sep + 1).join(" "));
    process.stdout.write(res.stdout);
    process.stderr.write(res.stderr);
    process.exit(res.exitCode);
    break;
  }
  default:
    help();
    if (cmd) process.exitCode = 1;
}
