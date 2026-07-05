# Payments Architecture

## Overview

SmartKlass uses **Stripe** as the payment processor for all commercial access. We do not store card numbers, CVVs, or PCI-sensitive data. Our database mirrors Stripe object state for fulfillment, support, and reporting.

Money movement is **course-plan scoped**: each checkout references an `AccessPlan` row.

## Platform fee (SmartKlass revenue)

On every paid subscriber or one-time purchase, SmartKlass collects:

- **20%** of the learner charge, **or**
- **$5.00 minimum** (500 USD cents),

**whichever is higher.** The creator receives the remainder.

Constants and calculation live in `packages/shared/src/platform-fees.ts` (`calculatePlatformFee`). Creator Studio surfaces the breakdown on subscriber pricing cards; checkout stores `platformFeeCents` and `creatorEarningsCents` on Stripe session and payment metadata for reporting.

Stripe Connect / `application_fee_amount` wiring is a follow-up once creator payout accounts are onboarded.

## Components

| Service | Responsibility |
|---------|----------------|
| `StripeClientService` | SDK initialization, API version pinning |
| `CheckoutService` | Create Checkout Sessions, lazy Stripe Price creation |
| `StripeWebhookService` | Verify signatures, dispatch events, idempotency |
| `BillingFulfillmentService` | Write `Payment`, `UserPurchase`/`UserSubscription`, `CourseAccess` |
| `BillingService` | Learner billing summary (`GET /billing/me`) |

Module: `apps/api/src/modules/billing/`

## Checkout flow

### Request

```
POST /api/v1/checkout/course-plan
Authorization: Bearer <jwt>
{ "accessPlanId": "..." }
```

### Validation (`CheckoutService`)

- Plan exists, active, not deleted
- `planType !== FREE`
- `priceCents > 0`
- Parent course `status === PUBLISHED`
- Subscription plans have `WEEKLY`, `MONTHLY`, or `YEARLY` interval

### Stripe session

| `planType` | Checkout `mode` | Result object |
|------------|-----------------|---------------|
| `ONE_TIME` | `payment` | PaymentIntent |
| `SUBSCRIPTION` | `subscription` | Subscription |

Metadata attached to session (user ID, course ID, plan ID) for webhook correlation.

### Lazy price creation

On first checkout for a plan:

1. Create Stripe Product (course + plan name)
2. Create Stripe Price (amount, currency, recurring if applicable)
3. Persist `stripePriceId` on `AccessPlan`

Subsequent checkouts reuse the price. **Price changes** require new Stripe Price rows — grandfathering policy is product/legal, not automatic.

## Webhook flow

```
Stripe → POST /api/v1/stripe/webhook (raw body)
      → signature verification (STRIPE_WEBHOOK_SECRET)
      → ProcessedStripeEvent insert (idempotent by event.id)
      → handler dispatch
      → BillingFulfillmentService
```

Nest bootstrap enables `rawBody: true` — required for signature validation.

### Handled events (representative)

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Fulfill purchase or create subscription + grant |
| `invoice.paid` | Extend subscription period |
| `invoice.payment_failed` | Mark `PAST_DUE` |
| `customer.subscription.updated` | Sync status and period |
| `customer.subscription.deleted` | Cancel subscription |

Exact handler matrix lives in `stripe-webhook.service.ts` — treat code as authoritative when docs drift.

## Fulfillment writes

Successful one-time payment:

```
Payment (SUCCEEDED)
  → UserPurchase (COMPLETED)
    → CourseAccess (expires per plan)
```

Successful subscription:

```
UserSubscription (ACTIVE, stripe_subscription_id, period dates)
  → CourseAccess (linked via user_subscription_id)
```

**Access grants are the product.** Stripe objects are the payment audit trail.

## Idempotency

`processed_stripe_events` stores Stripe `event.id` before side effects. Duplicate deliveries (common) exit early without double-granting.

This is non-negotiable for financial correctness.

## Learner-facing APIs

| Endpoint | Purpose |
|----------|---------|
| `GET /billing/me` | Payments, purchases, subscriptions summary |
| `PurchasesModule.listMine` | Purchase history |
| `SubscriptionsModule.listMine` | Active/canceled subscriptions |

Web surfaces: `/settings/billing`, `/subscriptions`, `/library`.

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `STRIPE_SECRET_KEY` | Production | API calls |
| `STRIPE_WEBHOOK_SECRET` | Production | Webhook verification |

Missing keys: checkout fails closed; webhooks reject unsigned requests.

## Error handling

| Scenario | Behavior |
|----------|----------|
| Checkout on draft course | 400 Bad Request |
| Free plan checkout | 400 — use free fulfillment path |
| Webhook signature invalid | 400 — Stripe retries |
| Fulfillment DB error | 500 — Stripe retries; monitor for poison events |

## Reconciliation

Support playbook:

1. Find `Payment` by `stripe_payment_intent_id`
2. Cross-check Stripe Dashboard
3. Verify `CourseAccess` exists for user+course
4. Check `ProcessedStripeEvent` for duplicate or missing event

## Creator payouts (not v1)

Current architecture collects revenue to **platform Stripe account**. Creator payouts via Stripe Connect are a planned layer:

- `creator_profiles.stripe_connect_account_id` (future column)
- Separate transfer events on fulfillment or periodic payout job

Do not block v1 launch on Connect — do not promise creators instant payouts until built.

## Security notes

- Never log full webhook payloads in production (PII)
- Restrict webhook route to Stripe IP ranges at edge (optional defense in depth)
- JWT required for checkout creation — anonymous users cannot initiate paid sessions

## Related

- [Product: subscription model](../product/subscription-model.md)
- [Database design](./database-design.md)
- [ADR-005: Stripe for payments](../adr/ADR-005-stripe-for-payments.md)
