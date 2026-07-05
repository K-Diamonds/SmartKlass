# Payments Architecture

## Overview

SmartKlass uses **Stripe Checkout** + **Stripe Connect Express** for all paid course access. Card data never touches our servers (PCI SAQ A).

Money movement is **course-plan scoped** — each checkout references an `AccessPlan`.

**Stripe Connect is v1**, not deferred.

## Platform fee

On every paid charge:

- **20%** of learner payment, **or**
- **$5.00 minimum** (500 USD cents),

whichever is higher. Creator receives the remainder via Connect transfer.

Implementation: `packages/shared/src/platform-fees.ts` (`calculatePlatformFee`).

## Split payment model

```
Student pays full plan price
  ├─ application_fee_* → SmartKlass platform account
  └─ transfer_data.destination → Creator Connect account
```

| `planType` | Checkout mode | Fee wiring |
|------------|---------------|------------|
| `ONE_TIME` | `payment` | `application_fee_amount` |
| `SUBSCRIPTION` | `subscription` | `application_fee_percent` |

Creators must complete Connect onboarding before checkout is allowed.

## Components

| Service | Responsibility |
|---------|----------------|
| `CheckoutService` | Checkout Sessions, lazy Stripe Prices, Connect destination charges |
| `StripeWebhookService` | Signature verify, event dispatch, idempotency |
| `BillingFulfillmentService` | `Payment`, purchases/subscriptions, `CourseAccess` grants |
| `MarketplaceAccountingService` | `CreatorTransaction`, `Refund`, `Dispute`, `CreatorPayout` ledger |
| `CreatorBillingService` | Connect onboarding, payout summary, certificate wallet |
| `BillingService` | Learner billing (`GET /billing/me`) |

Module: `apps/api/src/modules/billing/`

## Checkout flow

```
POST /api/v1/checkout/course-plan
Authorization: Bearer <jwt>
{ "accessPlanId": "..." }
```

Validation:

- Plan active, paid, course `PUBLISHED`
- Creator Connect account ready (`charges_enabled`, `transfers` active)
- Subscription interval valid

Metadata on session + PaymentIntent/Subscription includes: `userId`, `courseId`, `accessPlanId`, `platformFeeCents`, `creatorNetCents`, `feeRuleLabel`.

**Metadata rule:** `mergeJsonMetadata()` on every `Payment.metadata` update.

## Fulfillment + ledger

On successful payment:

```
Payment (SUCCEEDED)
  → UserPurchase or UserSubscription
    → CourseAccess grant
  → CreatorTransaction (status PENDING, availableAt = paidAt + 30d)
```

Access grants are the product. Ledger rows are the audit trail.

## 30-day payout model

Two layers (complementary):

1. **Stripe Connect** — `delay_days: 30` on connected account payout schedule
2. **Internal ledger** — `CreatorTransaction.status = PENDING` until `availableAt`, then `AVAILABLE`

`promoteMaturedTransactions()` runs on balance reads and `payout.paid`.

On `payout.paid`, available transactions are marked `PAID_OUT` (FIFO) and `CreatorPayout` is upserted.

## Webhooks

```
Stripe → POST /api/v1/stripe/webhook (raw body)
      → constructEvent (STRIPE_WEBHOOK_SECRET)
      → ProcessedStripeEvent (idempotent by event.id)
      → handler
```

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Fulfill + ledger |
| `invoice.payment_succeeded` | Renew subscription + ledger |
| `invoice.payment_failed` | `PAST_DUE` |
| `customer.subscription.updated/deleted` | Sync / revoke access |
| `charge.refunded` | Sync refunds |
| `refund.created` / `refund.updated` | Upsert `refunds` |
| `charge.dispute.created` / `.updated` | Upsert `disputes`, freeze transaction |
| `charge.dispute.closed` | Resolve or reverse |
| `payout.paid` / `payout.failed` / `payout.updated` | Mirror `creator_payouts` |

Enable **Connect events** in Stripe Dashboard.

## Balance derivation

Course revenue balances come from `CreatorTransaction` aggregation — **not** `creator_profiles.available_balance_cents` (certificate wallet only).

## Idempotency

- `processed_stripe_events` — webhook event IDs
- `CreatorTransaction` — unique on `paymentId` / `stripePaymentIntentId` / `stripeChargeId`
- `Refund` — unique on `stripeRefundId`
- `Dispute` — unique on `stripeDisputeId`
- `CreatorPayout` — unique on `stripePayoutId`

## Environment

| Variable | Required | Purpose |
|----------|----------|---------|
| `STRIPE_SECRET_KEY` | Production | API |
| `STRIPE_WEBHOOK_SECRET` | Production | Webhooks |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Web | Client |

## Reconciliation playbook

1. `Payment` by Stripe IDs
2. `CreatorTransaction` by `paymentId`
3. `Refund` / `Dispute` if clawed back
4. Stripe Dashboard (platform + connected account)
5. `CourseAccess` for entitlement
6. `ProcessedStripeEvent` for duplicate delivery

## Related

- [Stripe Connect](./stripe-connect.md)
- [Creator payouts](./creator-payouts.md)
- [ADR-005: Stripe Connect marketplace](../adr/ADR-005-stripe-connect-marketplace-payments.md)
- [Database design](./database-design.md)
