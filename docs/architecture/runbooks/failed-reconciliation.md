# Failed reconciliation runbook

## Symptoms

- Nightly reconciliation report status `FAILED` or `DISCREPANCY`
- `reconciliation_mismatches_total` metric increased
- Finance reports GMV / platform fee drift vs Stripe
- Admin dashboard shows non-zero discrepancy count

## Immediate triage

1. Open latest report in admin reconciliation UI or API.
2. Classify discrepancies by code:
   - `payment_amount_mismatch`
   - `transaction_fee_mismatch`
   - `payout_amount_mismatch`
   - Missing local or Stripe objects
3. Note time window — reconciliation is point-in-time; new payments during run are expected lag.

```sql
SELECT id, status, summary, created_at
FROM reconciliation_reports
ORDER BY created_at DESC
LIMIT 5;
```

## Investigation

### Local missing charge

- Webhook may have failed — see [stripe-webhook-failure.md](./stripe-webhook-failure.md).
- Check `processed_stripe_events` for the Stripe event ID.

### Amount mismatch

1. Compare `payments.amount_cents` vs Stripe charge amount.
2. Check refunds / partial refunds not reflected locally.
3. Verify currency (USD cents) and application fee on Connect charges.

### Payout / transfer mismatch

- See [payout-dispute.md](./payout-dispute.md).

## Recovery

1. Fix data via approved admin tools only (no manual SQL in production without ticket).
2. Re-run reconciliation for the period after fix.
3. Attach report ID to finance ticket.

## When to pause payouts

- Discrepancy > platform threshold (configure per finance policy)
- Suspected duplicate transfers or missing refunds

## Prevention

- Alert on any report with `DISCREPANCY` status.
- Weekly review of top discrepancy codes.
- Keep Stripe API pagination limits monitored during large backfills.
