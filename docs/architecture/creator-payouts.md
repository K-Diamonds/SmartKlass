# Creator Payouts

## Money flow summary

```
Learner checkout
  → Stripe charge (full amount)
  → application_fee → SmartKlass platform
  → transfer → Creator Connect balance
  → 30-day Stripe delay_days hold
  → automatic bank payout (Stripe-managed)
```

SmartKlass does **not** manually click "release payout" in v1. The 30-day window is enforced by Stripe Connect payout settings plus our internal `CreatorTransaction.availableAt` ledger.

## Ledger-first accounting

### CreatorTransaction

Created on every successful one-time purchase or subscription invoice payment.

| Field | Purpose |
|-------|---------|
| `grossAmountCents` | Learner charge |
| `platformFeeCents` | SmartKlass fee (20% or $5 min) |
| `stripeFeeCents` | Stripe processing fee when known |
| `creatorNetCents` | Creator share after platform fee |
| `status` | `PENDING` → `AVAILABLE` → `PAID_OUT` (or `REFUNDED` / `DISPUTED` / `REVERSED`) |
| `availableAt` | `paidAt + 30 days` |
| `paidOutAt` | Set when included in a completed Stripe payout |

**Status machine**

| Status | Meaning |
|--------|---------|
| `PENDING` | Payment succeeded; inside 30-day hold window |
| `AVAILABLE` | Hold matured (`availableAt <= now`); eligible for Stripe payout |
| `PAID_OUT` | Matched to a completed `payout.paid` event (FIFO) |
| `REFUNDED` | Learner refund succeeded |
| `DISPUTED` | Chargeback opened — funds frozen in ledger |
| `REVERSED` | Dispute lost — creator share reversed |

`MarketplaceAccountingService.promoteMaturedTransactions()` moves `PENDING → AVAILABLE` when `availableAt` passes. Called during balance reads and on `payout.paid`.

### CreatorPayout

Mirrors Stripe Connect payout objects.

| Field | Purpose |
|-------|---------|
| `stripePayoutId` | Stripe payout ID (unique) |
| `amountCents` | Payout amount |
| `status` | `PENDING`, `PROCESSING`, `PAID`, `FAILED`, `CANCELED` |
| `scheduledFor` | Expected arrival from Stripe |
| `paidAt` | Actual payout completion |
| `failureReason` | From Stripe on `payout.failed` |

### Refund / Dispute

Linked to `paymentId` and `creatorTransactionId` for audit trails. Webhook handlers update transaction status — they do not delete rows.

## Balance derivation

**Do not** use `creator_profiles.available_balance_cents` for course earnings.

Use `MarketplaceAccountingService.getLedgerBalances(creatorProfileId)`:

| Derived field | Source statuses |
|---------------|-----------------|
| `pendingCents` | `PENDING` |
| `availableCents` | `AVAILABLE` |
| `paidOutCents` | `PAID_OUT` |
| `refundedCents` | `REFUNDED` |
| `disputedCents` | `DISPUTED`, `REVERSED` |

Creator Studio `GET /billing/creator/payouts/summary` returns ledger-derived `pendingBalanceCents` and `availableBalanceCents`, plus Stripe balance/payout ETA for cross-check.

## Certificate wallet (separate)

`creator_profiles.available_balance_cents` remains for **certificate enablement** debits only — unrelated to Connect course revenue.

## Support reconciliation

1. Find `Payment` by `stripe_payment_intent_id` or `stripe_charge_id`
2. Find `CreatorTransaction` by `paymentId`
3. Check `Refund` / `Dispute` rows
4. Cross-check Stripe Dashboard (platform + connected account)
5. Verify `ProcessedStripeEvent` for webhook idempotency

## What v1 does not include

- Manual operator approval before bank payout
- Custom escrow account separate from Stripe Connect
- Per-transaction manual release overrides

## Related

- [Stripe Connect](./stripe-connect.md)
- [Payments](./payments.md)
