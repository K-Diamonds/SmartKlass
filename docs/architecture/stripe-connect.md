# Stripe Connect Architecture

## Overview

SmartKlass is a **Stripe Connect marketplace**. Learners pay the full course price; SmartKlass retains a platform fee; creators receive the remainder on connected Express accounts.

This is **v1 production behavior**, not a follow-up phase.

## Account model

| Actor | Stripe object | Notes |
|-------|---------------|-------|
| SmartKlass | Platform account | Collects `application_fee_*`, owns Checkout |
| Creator | Connect Express account | `creator_profiles.stripe_connect_account_id` |
| Learner | Stripe Customer (implicit via Checkout) | No stored PAN/CVV in SmartKlass |

Onboarding flow:

1. Creator opens Studio → Payouts
2. `POST /billing/creator/stripe-connect/onboard` creates or reuses Express account
3. Stripe Account Link completes KYC
4. `getConnectDestinationForCourse` validates `charges_enabled` + `transfers` before checkout

## Destination charges

Every paid course checkout uses **destination charges**:

```
Learner pays $79
  ├─ Platform fee $15.80 (20%) → SmartKlass platform balance
  └─ Transfer $63.20 → Creator Connect balance
```

### One-time plans (`ONE_TIME`)

```typescript
payment_intent_data: {
  application_fee_amount: platformFeeCents,
  transfer_data: { destination: stripeConnectAccountId },
}
```

### Subscription plans (`SUBSCRIPTION`)

```typescript
subscription_data: {
  application_fee_percent: connectApplicationFeePercent(price, platformFeeCents),
  transfer_data: { destination: stripeConnectAccountId },
}
```

Fee math lives in `packages/shared/src/platform-fees.ts`.

## Payout schedule

Connected accounts are configured with:

```typescript
settings.payouts.schedule = {
  interval: 'daily',
  delay_days: CREATOR_PAYOUT_DELAY_DAYS, // 30
}
```

This is a **Stripe-managed hold**, not an internal escrow release queue.

## Gating rules

Checkout fails closed when:

- Creator has no `stripe_connect_account_id`
- Connect account cannot accept charges
- `transfers` capability is not active
- Course is not `PUBLISHED`

Certificate enablement uses a separate platform-only Checkout (no Connect split).

## Webhooks

Platform webhook endpoint: `POST /api/v1/stripe/webhook`

Enable **Connect events** in Stripe Dashboard so payout events include `event.account`.

Handled Connect-related events:

| Event | Purpose |
|-------|---------|
| `checkout.session.completed` | Fulfillment + ledger |
| `invoice.payment_succeeded` | Renewal charges + ledger |
| `charge.refunded` | Refund reconciliation |
| `refund.created` / `refund.updated` | Refund row sync |
| `charge.dispute.created` / `.updated` / `.closed` | Dispute lifecycle |
| `payout.paid` / `payout.failed` / `payout.updated` | Payout mirror |

## Internal ledger

Stripe balance is authoritative for bank movement. SmartKlass maintains an **audit ledger** in MySQL:

- `creator_transactions` — per charge, 30-day `availableAt`, status machine
- `creator_payouts` — mirror of Stripe payouts to connected accounts
- `refunds` / `disputes` — clawback tracking

Do **not** use `creator_profiles.available_balance_cents` for course revenue — that field is certificate wallet only.

See [Creator payouts](./creator-payouts.md) and [Payments](./payments.md).

## Environment

| Variable | Purpose |
|----------|---------|
| `STRIPE_SECRET_KEY` | Platform + Connect API |
| `STRIPE_WEBHOOK_SECRET` | Webhook verification |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Web client |

## Related

- [Payments architecture](./payments.md)
- [Creator payouts](./creator-payouts.md)
- [ADR-005: Stripe Connect marketplace payments](../adr/ADR-005-stripe-connect-marketplace-payments.md)
