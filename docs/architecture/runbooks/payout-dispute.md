# Payout dispute runbook

## Symptoms

- Creator reports missing or incorrect payout
- Stripe Connect dashboard shows transfer/payout dispute
- `payout_amount_mismatch` in reconciliation discrepancies
- Admin payout queue shows `HELD` or `FAILED` status

## Immediate triage

1. Identify creator profile and payout period in admin dashboard.
2. Pull local `creator_transactions` and linked `payments` for the period.
3. Compare against Stripe Connect transfers and payouts for the connected account.
4. Check risk flags / holds on the creator profile.

```sql
SELECT ct.id, ct.gross_amount_cents, ct.net_amount_cents, ct.status, p.stripe_payment_intent_id
FROM creator_transactions ct
JOIN payments p ON p.id = ct.payment_id
WHERE ct.creator_profile_id = '<creator-id>'
ORDER BY ct.created_at DESC
LIMIT 50;
```

## Resolution paths

### Timing / maturity

- Confirm transaction passed maturity window before payout eligibility.
- Run `promote_matured_transactions` job manually if scheduler lagged.

### Amount mismatch

1. Generate reconciliation report (admin v2).
2. Document delta in admin audit log.
3. If local ledger is wrong: create compensating adjustment (finance approval required).
4. If Stripe is wrong: open Stripe support case with charge/transfer IDs.

### Dispute / chargeback

1. Freeze further payouts for affected creator if risk policy requires.
2. Link dispute to `RefundRequest` workflow when refund is warranted.
3. Notify creator via support template after finance sign-off.

## Communication

- Do not promise payout dates until Stripe transfer is confirmed.
- Provide creator with transaction IDs and expected resolution SLA (internal).

## Prevention

- Alert on `reconciliation_mismatches_total` after nightly reconciliation.
- Review creators with repeated payout holds monthly.
