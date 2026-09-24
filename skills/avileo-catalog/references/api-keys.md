# Avileo API key boundaries

Choose credentials by operation, never by convenience.

| Prefix       | Audience                                    | Boundary                                                        |
| ------------ | ------------------------------------------- | --------------------------------------------------------------- |
| `avileo_pk_` | Public catalog, storefront, browser and SDK | Publishable. It cannot administer Avileo or create credentials. |
| `avileo_sk_` | Trusted server-side agent for one business  | Secret. Inject only as `AVILEO_AGENT_API_KEY`.                  |
| `sak_`       | Cross-product System Admin operator         | Never use it with the tenant Agent API or catalog CLI.          |

## Scope and intent routing

An `avileo_sk_` key resolves exactly one business on the server. The Agent API
does not accept a caller-selected tenant identifier, and the public CLI exposes
only `business show`—never business list, create, select, or switch.

| User intent                                     | Credential and surface                                                                 |
| ----------------------------------------------- | -------------------------------------------------------------------------------------- |
| Inspect or manage the connected private catalog | `avileo_sk_` through `avileo-catalog` and the official CLI.                            |
| Build a public catalog/storefront application   | Create an approved `avileo_pk_`, then use `avileo-storefront` and the public SDK root. |
| Operate another business                        | Stop. A human must provision it and authorize a different Agent Key.                   |
| Perform System Admin work                       | Stop and route to the controlled operator environment; never substitute a tenant key.  |

`@tarileo/avileo-sdk/agent` is server-only private automation.
`@tarileo/avileo-sdk` and `@tarileo/avileo-sdk/react` are the public storefront
surfaces. Never suggest the `/agent` subpath for browser or TanStack Start
storefront code.

The Agent Key has one visible mode:

- `read`: inspect the business, profile, catalog, assets and inventory;
- `mutate`: includes reads and may propose administrative changes.

A `mutate` Agent Key does not execute immediately. It creates an exact,
tenant-scoped proposal, the human approves it in Avileo, and the agent applies
that approved payload. This includes creating an `avileo_pk_` Client Key for a
web project. The public Client Key may then be written to the web project's
`.env`; the secret Agent Key must never be written there or exposed to the
browser.

The CLI reads the Agent Key only from its host environment or protected local
credential store. Never place it in argv, JSON input, URLs, issues, output or
logs. Changing a key between `read` and `mutate` updates the same credential and
does not rotate its secret.
