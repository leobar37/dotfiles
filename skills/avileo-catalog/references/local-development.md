# Local development and package resolution

Package source and API target are separate decisions. Resolve both before the
first authentication command, then keep them unchanged for the session.

## Choose one CLI command

Use this priority order:

1. Preserve an already selected, working host command or project wrapper. Verify
   it with `auth status --json` and `business show --json`; do not replace it
   merely because another reference shows an `npx` fallback.
2. When the current workspace is the Elena Tech source checkout, or the user has
   supplied its exact root, use the local CLI and workspace SDK.
3. Otherwise use the pinned published release:
   `npx --yes @tarileo/avileo-catalog-cli@0.3.1`.

Never guess a checkout path or scan unrelated home directories. For the local
source path, first build the SDK because its package exports point to `dist`:

```sh
bun run --cwd "$AVILEO_MONOREPO_ROOT" --filter @tarileo/avileo-sdk build
bun --cwd "$AVILEO_MONOREPO_ROOT/apps/avileo/agent-cli" src/index.ts business show --json
```

The local CLI imports `@tarileo/avileo-sdk` through the Bun workspace, so this
invocation tests the local CLI and local Agent SDK together. Treat the complete
`bun --cwd ... src/index.ts` portion as the CLI prefix for every later command.
Published `npx --yes @tarileo/avileo-catalog-cli@0.3.1` snippets are portable
fallbacks; replace only that prefix when local mode was selected.

## Choose the API target independently

The SDK defaults to production. A local package does not imply a local backend.
For a local Avileo stack, set `AVILEO_AGENT_BASE_URL` to the confirmed backend
URL before `auth login` or `auth configure`. Use a reachable Tailscale URL when
the human will open or verify it from another device, and first confirm the
service listens on all interfaces.

After authentication, run `auth status --json` and `business show --json` with
the same CLI prefix. Stop if the credential, business, or API target differs
from the one the user selected. Never silently fall back from a failed local
backend to production.

## Public SDK in another local application

This private catalog skill does not put the Agent SDK in a browser. When handing
a storefront to `avileo-storefront`, preserve the same source decision:

- inside the Elena Tech Bun workspace, depend on `@tarileo/avileo-sdk` with
  `workspace:*`;
- from an external app, use `file:<verified-path-to-apps/avileo/sdk>` only when
  the user supplied or confirmed that checkout, and build the local SDK first;
- without a confirmed source checkout, install the pinned published SDK.

Verify the installed package resolves to the intended workspace or file path.
Package linking and `VITE_AVILEO_API_URL` configuration are independent; local
SDK code must not silently call the production API.
