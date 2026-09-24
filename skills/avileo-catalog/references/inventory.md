# Inventory

Inventory reads require the inventory read action. Inventory changes additionally
require inventory write access confirmed by the initial business context. Stop
rather than attempting an adjustment when that action is absent.

## Read before correction

```sh
npx --yes @tarileo/avileo-catalog-cli@0.3.1 catalog inventory get <variant-id> --json
npx --yes @tarileo/avileo-catalog-cli@0.3.1 catalog inventory movements <variant-id> --json
```

Use `--reason`, `--limit`, and `--offset` on movements only to narrow an
already-authorized investigation. Read the current snapshot immediately before
proposing a correction; never calculate a quantity from stale output.

## Preview and apply

An adjustment and a set operation both require structured JSON input. The
non-applying command returns a local validation/diff. Explain whether the
request changes by a delta or sets an expected quantity, show the current
snapshot, and obtain explicit approval before applying.

```sh
npx --yes @tarileo/avileo-catalog-cli@0.3.1 catalog inventory adjust <variant-id> --from adjustment.json --json
npx --yes @tarileo/avileo-catalog-cli@0.3.1 catalog inventory adjust <variant-id> --from adjustment.json --apply --json
npx --yes @tarileo/avileo-catalog-cli@0.3.1 catalog inventory set <variant-id> --from inventory-set.json --json
npx --yes @tarileo/avileo-catalog-cli@0.3.1 catalog inventory set <variant-id> --from inventory-set.json --apply --json
```

After approval, report the returned snapshot and safe movement result. Do not
retry a rejected or conflicting correction by changing values silently.
