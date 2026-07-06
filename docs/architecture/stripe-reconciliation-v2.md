# Stripe reconciliation v2

Reconciliation compares local payments and creator ledger entries against **all** Stripe objects in the report period using auto-pagination.

## What changed from v1

| v1 | v2 |
|----|-----|
| Max 100 charges/fees/transfers/payouts per type | Full Stripe list via `autoPagination` / page loops |
| Aggregate totals only in discrepancies | Per-object line items with codes and deltas |
| Single summary blob | `discrepancies.items[]` + `summary` aggregates |

## Stripe objects fetched

For each report period `[periodStart, periodEnd]`:

- `charges` (succeeded in period)
- `application_fees`
- `transfers`
- `payouts`

Pagination helpers live in `apps/api/src/modules/admin-risk/stripe-pagination.util.ts`.

## Discrepancy line items

Each item in `discrepancies.items` includes:

| Field | Description |
|-------|-------------|
| `code` | Machine-readable type (`PAYMENT_CHARGE_MISMATCH`, `ORPHAN_STRIPE_CHARGE`, …) |
| `message` | Human-readable explanation |
| `objectType` | `charge`, `payment`, `payout`, etc. |
| `objectId` | Local or Stripe ID |
| `stripeId` | Stripe object ID when applicable |
| `localCents` | Local amount |
| `stripeCents` | Stripe amount |
| `deltaCents` | Signed difference |

`summary` still provides roll-up totals for dashboard cards.

## Running a report

```
POST /admin/reconciliation/run
{ "periodStart": "2026-06-01", "periodEnd": "2026-06-30" }
```

Requires `admin:reconciliation:run`. Reports are persisted in `ReconciliationReport` and processed asynchronously.

## Ops playbook

1. Run report for closed month
2. Filter `discrepancies.items` by `code`
3. For `PAYMENT_CHARGE_MISMATCH`, drill into `/admin/transactions/:id`
4. For orphan Stripe objects, check webhook delivery and replay if needed
5. Re-run after fixes; compare `completedAt` timestamps

## Related

- [Reconciliation (v1 overview)](./reconciliation.md)
- [Payments](./payments.md)
