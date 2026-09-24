# Import product lists from any source

Use this workflow once the agent has a bounded product list, regardless of
whether it came from user research, a supplier file, a spreadsheet, another
API, or a scraper. Avileo owns only normalization and catalog import; it does
not require, invoke, or integrate with the source system.

## Normalize before preview

1. Keep at most 100 product aggregates in the input file.
2. Normalize prices, quantities, descriptions, categories, variants, and image
   sources into the documented structured import shape.
3. Preserve source identity where it is available. Group variants only when the
   input nests them under a product or provides an explicit shared product
   identity. Never group products because their names or SKUs merely resemble
   each other.
4. Do not guess an update target. Use an explicit returned product identifier or
   a previously established external link; otherwise let preview surface a
   conflict for review.

Use the connected business currency returned by `business show`; never guess a
conversion. A minimal input looks like this:

```json
{
  "source": "external-product-list",
  "products": [
    {
      "externalRef": {
        "source": "supplier-file",
        "externalId": "SKU-001"
      },
      "name": "Arroz extra 1 kg",
      "category": { "name": "Abarrotes" },
      "unit": "unidad",
      "basePrice": "6.50",
      "isActive": true
    }
  ]
}
```

Use a stable `externalRef.source` plus `externalId` when the source provides
one. It lets later previews resolve the same product without guessing from a
similar name. Omit fields that were not supplied or verified; do not invent
cost, stock, images, descriptions, variants, or identifiers.

## Create a durable preview

```sh
npx --yes @tarileo/avileo-catalog-cli@0.3.1 catalog import preview --from products-for-avileo.json --json
```

This server-side preview does not create catalog records. Review every returned
item action (`create`, `update`, `skip`, `conflict`, or `invalid`), status and
message, plus the summary counts. Record the returned `importId` as
`IMPORT_ID`.

Report the planned actions and unresolved conflicts. Ask for explicit approval
of this exact preview before continuing. Do not replace this durable preview
with a local approximation, and do not regenerate it after the user approves
unless they also review and approve the new preview.

## Apply only after both approval gates

Use the exact identifier returned by the reviewed preview:

```sh
# Non-applying local validation
npx --yes @tarileo/avileo-catalog-cli@0.3.1 catalog import apply <IMPORT_ID> --json

# Create the server proposal; this still does not mutate the catalog
npx --yes @tarileo/avileo-catalog-cli@0.3.1 catalog import apply <IMPORT_ID> --apply --json

# Only after the human approves that proposal in Avileo
npx --yes @tarileo/avileo-catalog-cli@0.3.1 catalog import apply <IMPORT_ID> --apply --approval-id <APPROVAL_ID> --json
```

The first command validates locally. The second returns the server-generated
summary, diff and `approvalUrl`. Show them to the user and wait. Only the third
command queues the durable import, using the approved proposal identifier.

## Poll and report

```sh
npx --yes @tarileo/avileo-catalog-cli@0.3.1 catalog import status <IMPORT_ID> --json
```

Poll with the same preview-returned identifier until the status is terminal.
Report the final structured status and summary counts for applied, skipped,
conflict, invalid and failed items. Do not alter inputs, requeue, or attempt a
workaround merely because an external source or an item failed.
