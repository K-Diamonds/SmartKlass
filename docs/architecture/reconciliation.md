# Stripe ledger reconciliation

The reconciliation job compares SmartKlass local accounting with Stripe platform objects for a given period.

## What is compared

| Local | Stripe |
|-------|--------|
| `Payment` (succeeded) | `charges` |
| `CreatorTransaction.platformFeeCents` | `charge.application_fee_amount` |
| `CreatorTransaction.creatorNetCents` | `transfers` (destination charges) |
| `CreatorPayout` | `payouts` |

Results are stored in `ReconciliationReport`:

- `summary` — counts and cent totals per source
- `discrepancies` — structured mismatch list with `deltaCents` where applicable
- `localBalanceCents` / `stripeBalanceCents` — snapshot balances at completion

## Running a report

```http
POST /admin/reconciliation/run
Content-Type: application/json

{
  "periodStart": "2026-06-01T00:00:00.000Z",
  "periodEnd": "2026-06-30T23:59:59.999Z"
}
```

The job runs asynchronously:

1. `PENDING` → report row created, audit log written
2. `RUNNING` → Stripe + DB queries execute
3. `COMPLETED` or `FAILED` → summary/discrepancies populated

Poll status:

```http
GET /admin/reconciliation/reports/:id
GET /admin/reconciliation/reports
```

## Discrepancy codes

| Code | Meaning |
|------|---------|
| `payments_vs_charges` | Local succeeded payments total ≠ Stripe charges total |
| `platform_fees_vs_application_fees` | Ledger platform fees ≠ Stripe application fees |
| `orphan_creator_transactions` | Creator transactions without matching local payments |

## Operational notes

- Reports use Stripe list APIs with `limit: 100` per object type; extend pagination for high-volume periods.
- Platform balance is read from the **platform** Stripe account, not connected accounts.
- Per-creator Connect balance reconciliation can be added as a follow-up using `stripeAccount` context.

## Related

- [Marketplace risk](./marketplace-risk.md)
- [Payments](./payments.md)
- [Stripe Connect](./stripe-connect.md)
