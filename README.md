# dotfiles

Canonical configs + inventory + ssh-runner para sincronizar workstation, VPS y Mac.
El workstation es el origen canónico; todo lo versionado aquí se empuja hacia afuera,
nunca al revés.

## Requisitos

- [Bun](https://bun.sh) ≥ 1.0
- `rsync`, `ssh` (para `sync` / `exec`)
- [Tailscale](https://tailscale.com) (transporte base entre máquinas)
- [`gh`](https://cli.github.com) (solo para operaciones con GitHub)

## Estructura

| Ruta | Qué es |
|---|---|
| `src/cli.ts` | CLI principal: profiles, inventory, audit, sync, exec, models, climier |
| `src/modules.ts` | Definición de módulos sincronizables + auditoría local/remota |
| `src/inventory.ts` | Parser de `inventory/devices.yml` y resolución de conexiones |
| `src/ssh.ts` / `src/tailnet.ts` | ssh-runner con fallback de transporte + estado Tailscale |
| `inventory/devices.yml` | Inventario de máquinas (roles, transportes, estado) |
| `skills/` | Canon de skills de agentes (`~/.agents/skills`); `.skill-lock.json` fija el upstream |
| `nvim/` | Config Neovim (`init.lua` + `lua/`) |
| `shell/` | `.zshenv` + versiones `.safe` de `.zshrc` / `.bashrc` / gitconfig |
| `opencode/` | Agentes, comandos y prompts (el `opencode.json` con API keys **no** se versiona) |
| `pi/` | `settings.json` y modelos del agente Pi |
| `omp/` | Config segura, catálogo y perfiles del worker-runtime OMP |
| `scripts/` | `sync.sh`, `install-tools.sh`, `audit.sh`, utilidades pi/gdev |
| `artifacts-cli/` | ⚠️ **Checkout independiente** — repo propio (`leobar37/artifacts-cli`), ignorado aquí (ver `.gitignore`) |

## Uso

```bash
bun src/cli.ts profiles                 # perfiles + transportes + estado tailnet
bun src/cli.ts inventory                # lista compacta de dispositivos
bun src/cli.ts audit [perfil|all]       # auditoría read-only (all = solo máquinas de dev)
bun src/cli.ts sync <perfil|all> [mods] [--dry-run]  # empuja configs al target
bun src/cli.ts exec <perfil> -- <cmd>   # comando remoto vía ssh-runner
bun src/cli.ts models                   # regenera omp/catalog.json
bun src/cli.ts climier [perfil|local|all] -- [args]  # DAG climier aquí o allá
```

Flags comunes: `--via <tailscale|alias|public>` elige transporte, `--dry-run` muestra
sin transferir.

```bash
# ejemplos
bun src/cli.ts audit gdev
bun src/cli.ts sync gdev nvim skills --dry-run
bun src/cli.ts exec gdev -- uname -a
./scripts/sync.sh gdev nvim skills      # empuje directo por módulo
```

Atajos en `package.json`: `bun run profiles|inventory|audit|sync|exec`.

## Máquinas

| Nombre | Rol | Transporte |
|---|---|---|
| `workstation` | canónica (origen) | local |
| `gdev` | target principal (GCP `gdev-01`, IAP tunnel) | alias `gdev` |
| `gcp-avileo-prod` | producción (IAP tunnel) | alias `gcp-avileo-prod` |
| `mac` | secundaria (MacBook, Tailscale `100.123.96.35`) | alias `mac` / tailnet |
| `vultr`, `hetzner-elena` | legacy, decomisionadas 2026-09-30 | — |

## Política de secretos

**Nunca se versionan valores reales.** Reglas:

- `*.token`, `broker.env`, `auth.json`, `*.db/sqlite` → ignorados por `.gitignore`
- `opencode/opencode.json` (con API keys embebidas) → ignorado; solo plantillas `.safe`
- `sync.sh` nunca transfiere secretos: `broker.env` y auth se configuran a mano vía stdin en cada máquina
- `docs/artifacts/` (previews locales) → ignorado

## Skills

`skills/` es el canon versionado que se empuja a `~/.agents/skills` en cada máquina.
`canonical-list.txt` + `.skill-lock.json` registran la lista oficial y el upstream.
Sincronizar a otras máquinas con `bin/sync-machines.sh` o `elena target sync-agents`
(ver `AGENTS.md`).
