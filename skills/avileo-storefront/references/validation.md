# Validation and delivery

Validate the target application with its own scripts. At minimum:

```sh
npm run test
npm run typecheck
npm run build
```

## Contract checks

- The app uses `@tarileo/avileo-sdk` or `/react`, never `/agent`.
- No `avileo_sk_`, `sak_`, or `AVILEO_AGENT_API_KEY` appears in source, public
  environment variables, generated output, logs, prompts, or browser storage.
- The configured `avileo_pk_` resolves the expected business before UI work is
  considered complete.
- Catalog reads, asset URLs, cart creation, and checkout use the configured API
  origin and preserve the Client Key header through the SDK.
- SSR and browser hydration render the same connected business.
- Assistant bootstrap is disabled unless explicitly requested and configured.
- Tests mock the SDK boundary; they do not call production.

## Deployment

TanStack Start can target Cloudflare Workers or another supported provider, but
the target application's deployment contract owns that choice. Never publish,
create cloud resources, or write production secrets without explicit approval.
After deployment, verify the public catalog and one non-destructive SDK read.
