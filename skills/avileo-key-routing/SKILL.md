---
name: avileo-key-routing
description: >
  Selects the safe Avileo credential boundary for public storefront, Tienda
  catalog-agent, and System Admin requests. Use before configuring an Avileo
  integration, automation, or agent when the available key type is uncertain.
license: MIT
metadata:
  version: '0.1.1'
---

# Avileo API key routing

Classify the requested operation before choosing a credential. A prefix is not
an authorization grant and no key may cross its intended boundary.
Require the host environment to inject secrets. Never accept, reveal, store, or
transmit a raw key.

## Key matrix

| Key          | Use it for                                                          | Never use it for                                                                         |
| ------------ | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `avileo_pk_` | Public storefront/browser SDK reads and approved public flows.      | Tenant dashboard actions, catalog-agent writes, inventory, or System Admin.              |
| `avileo_sk_` | Secret tenant catalog automation for an approved `tienda` business. | Browser exposure, another tenant, System Admin, or an operation outside granted actions. |
| `sak_`       | A separately approved System Admin operator integration.            | Tenant catalog CLI, storefront/browser code, or any human-only operation.                |

## Catalog agent route

For a catalog request, use `avileo_sk_` only when the host can inject it as
`AVILEO_AGENT_API_KEY`. Then delegate the operation to `avileo-catalog`.

Never accept a raw key in a prompt, command argument, JSON file, log, or URL.
The catalog skill confirms the tenant, mode, effective capability, and exact
scope before acting.

## Public client route

For a public storefront request, use the product's public SDK integration with
an `avileo_pk_` key. Keep that key browser-scoped and do not reinterpret a
successful public read as authorization for staff or catalog operations.

## System Admin route

A `sak_` credential is cross-product operator access, not a tenant key. This
public distribution intentionally provides no executable System Admin skill:
a public secret-injection-only operator CLI and explicit machine-safe scope
policy must exist first.

If a request requires System Admin work, stop and route it to the controlled
operator environment. Do not substitute `avileo_sk_` or `avileo_pk_`, attempt
direct transport calls, or bypass human-only or step-up controls.
