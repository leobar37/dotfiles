# SDK and credential boundaries

Classify the intent before writing code.

| Intent                           | Package                                     | Credential   | Runtime                |
| -------------------------------- | ------------------------------------------- | ------------ | ---------------------- |
| Public catalog/storefront        | `@tarileo/avileo-sdk`                       | `avileo_pk_` | Browser, SSR, loaders  |
| React storefront hooks/providers | `@tarileo/avileo-sdk/react`                 | `avileo_pk_` | React tree             |
| Private catalog administration   | `@tarileo/avileo-sdk/agent` or official CLI | `avileo_sk_` | Trusted server only    |
| System Admin operations          | Controlled operator tooling                 | `sak_`       | Never the public skill |

## Public Client Key

A Client Key is publishable and fixed to one business. It may live in a Vite
public variable and browser bundle. It grants only public SDK capabilities and
cannot administer Avileo or create another credential.

If the connected business needs a new Client Key, `avileo-catalog` proposes it:

```sh
npx --yes @tarileo/avileo-catalog-cli@0.3.0 catalog-key create   --name "Storefront"   --json
```

After the human approves the returned URL:

```sh
npx --yes @tarileo/avileo-catalog-cli@0.3.0 operation apply "$APPROVAL_ID" --json
```

The successful apply response exposes the `avileo_pk_...` once. Store it in the
target app's environment. Never copy the `avileo_sk_` used to propose it.

## Closed business scope

Neither SDK allows a storefront caller to select `businessId`. Both the public
Client Key and private Agent Key resolve their tenant server-side. If the user
names another business, stop and require human provisioning plus a different
credential; do not propose a fake switch/create workflow.
