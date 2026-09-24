---
name: elena-doppler
description: Manage Elena Tech secrets through Doppler via the elena CLI (never raw doppler CLI, never pasted values). Use when creating Doppler projects/configs, syncing Worker secrets, aligning dev/prd keys, or handling DOPPLER_TOKEN_ELENA_TECH, CLOUDFLARE tokens, VPS env files, and AI gateway keys. Triggers on doppler, secrets, sync-secrets, dopplerProject, requiredSecrets, dev/prd alignment, SCRAP_CHAT_API_KEY, service token.
---

# elena-doppler — Secrets via Doppler + elena CLI

**Rule zero: agents NEVER invoke the raw `doppler` binary.** It is
unauthenticated on this workstation, so every direct call fails. The only
authenticated Doppler shell path is the wrapper
`bun run elena doppler -- <doppler args>` (reads and `run` by default;
mutations need `--allow-write` plus explicit operator approval). All routine
secret work goes through `bun run elena env ...`. Never print secret values.

**Rule zero-bis: prefer the repo's own CLI over raw `wrangler`.** Some repos
wrap wrangler and inject the org Cloudflare credential themselves
(gateway-app-cafe-machine: `bun run cafe ...` resolves `CLOUDFLARE_API_TOKEN`
+ `CLOUDFLARE_ACCOUNT_ID` from env override or Doppler `elena-tech/prd` via
the global Doppler token, see `scripts/cli/cloudflare-credentials.ts`). Raw
`wrangler` outside that wrapper loses the injected credentials and falls back
to `wrangler login`, which fails in agent sessions (incident 2026-09-19:
deploy blocked on missing login until retried via `bun run cafe deploy`).
Read the repo CLI before assuming `wrangler login` is the way.

`run` y `shell` **exigen** `--project <producto> --config dev|prd`: el repo no
tiene `doppler.yaml` ni fallback local. El wrapper corta con esa instrucción
(antes el binario moría con `You must specify a project` + `The fallback file
does not exist`, y un publish de video perdió ~10 min probando proyectos).

## Auth (global token)

- Single org-wide token env: `DOPPLER_TOKEN_ELENA_TECH` (constant
  `GLOBAL_DOPPLER_TOKEN_ENV` in `cli/src/services/doppler-config.ts`).
- Missing token → the CLI itself tells the fix:
  `bun run elena env init-doppler --token dp.st.xxx` or define the env var.
- Auth check is `bun run elena env verify-tokens --providers doppler --json`
  (or `bun run elena doppler -- me`). Never run bare `doppler me`: without
  the wrapper it always fails and proves nothing. Do not invent tokens, do
  not store them in files.

## The dev/deploy alignment mechanism

- Every app has ONE Doppler project with (at least) configs `dev` + `prd`.
- **Same keys in both. Always.** A key entering `prd` enters `dev` too
  (placeholder value if needed). Values differ per env; keys never do.
- Deploy reads `prd` (see `dopplerConfig` below); local uses `dev`.

## Stuff projects (web Workers: scrap-many, elite-coffee, …)

Declared in `apps/stuff/<id>/stuff.config.json` → `deploy.cloudflare`:

| Field | Meaning |
|---|---|
| `dopplerProject` | Doppler project name (defaults to the stuff id) |
| `dopplerConfig` | Config for deploy (convention: `prd`) |
| `requiredSecrets` | Keys pushed via `wrangler secret put`. **Absent = sync ALL** secrets from the config. **`[]` = skip sync entirely** (correct when the Worker needs no secrets) |

Commands (from the monorepo root):

```bash
bun run elena stuff cloudflare sync-secrets <id>                    # prd -> production Worker
bun run elena stuff cloudflare sync-secrets <id> --config dev       # dev config (default)
bun run elena stuff cloudflare sync-secrets <id> --env test         # test Worker (needs testWranglerConfig)
bun run elena stuff cloudflare sync-secrets <id> --dry-run          # plan only, downloads nothing
```

## API / VPS secrets (NOT Doppler-injected)

- Product APIs (Elena, GymSpace, Avileo, scrap-many) read plain env files on
  the VPS (e.g. `infra/compose/scrap-many.env`, mode 600). Doppler never
  injects there automatically.
- Doppler may hold a key as **source of truth** (e.g. `SCRAP_CHAT_API_KEY`
  in project `scrap-many`, aligned dev/prd), but rotation means a **manual
  volcado** into the VPS env file + `compose up -d`. Say this explicitly;
  never imply auto-sync.
- scrap-many backend deploys **manually**, not via `elena ship` (no product
  config): push branch → `ssh scrap-many` (alias → `45.77.199.28`, root,
  `~/.ssh/config`; also registered as CLI target, repo `/opt/theelena`) →
  `git pull` → `compose up -d --build`. Runbook:
  `docs/scrap-many-product/deploy-runbook.md` (product repo).

| Name | What it is | Where it lives |
|---|---|---|
| `DOPPLER_TOKEN_ELENA_TECH` | Org-wide Doppler read token | Operator env / `env init-doppler` |
| `CLOUDFLARE_API_TOKEN` | DNS-01 for `*.test` certs (Caddy); also the org deploy credential when a repo CLI injects it (gateway-app-cafe-machine `cafe`: Doppler `elena-tech/prd` → wrangler env) | Doppler product projects + compose env |
| `CLOUDFLARE_DEPLOY_TOKEN` | **Does NOT exist as a repo var.** Default Worker deploys use `wrangler login`, not a token var — EXCEPT repos whose own CLI injects the org token (gateway-app-cafe-machine `cafe` CLI; never `login` there). If the operator names it, ask where they saw it | — |
| `SCRAP_CHAT_API_KEY` | Vercel AI Gateway key for the scrap-many chat (API-side, VPS env; empty = chat 503) | `scrap-many.env` (+ Doppler as source of truth if created) |

## Creating a new Doppler project (needs management token — ask first)

```bash
bun run elena doppler -- projects create <id> --allow-write
bun run elena doppler -- configs create prd --project <id> --allow-write
bun run elena doppler -- configs create dev --project <id> --allow-write
# then set the SAME keys in dev and prd
```

Never create projects/configs or set secrets without explicit operator go:
external mutation + needs management auth you usually don't have. The
wrapper refuses writes without `--allow-write` by design.
