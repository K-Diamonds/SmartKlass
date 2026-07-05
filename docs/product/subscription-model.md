# Subscription Model

## Commercial model (v1)

SmartKlass monetization is **course-centric**: each published course defines its own `AccessPlan` rows. Learners subscribe to a **specific course plan**, not to the entire platform library.

This matches how many independent creators sell (Patreon-style per-creator, Teachable-style per-course) and keeps fulfillment logic simple — every subscription resolves to one `courseId`.

Platform-wide "all access" subscription is a **future product layer**, not a schema blocker. The entitlement system (`CourseAccess`) already supports multiple grants per user across courses.

## Plan types

Schema enum `AccessPlanType`:

| Type | Billing | Stripe mode | Typical use |
|------|---------|-------------|-------------|
| `FREE` | None | N/A | Preview syllabus, lead capture |
| `SUBSCRIPTION` | Recurring | Checkout `mode: subscription` | Weekly, monthly, yearly |
| `ONE_TIME` | Single charge | Checkout `mode: payment` | Lifetime |

Subscription plans require `billingInterval`: `WEEKLY`, `MONTHLY`, or `YEARLY`.

## Marketing labels vs schema

Creator Studio exposes friendly labels; the database stays normalized:

| Studio label | `planType` | `billingInterval` | Notes |
|--------------|------------|-------------------|-------|
| Free | `FREE` | — | `priceCents = 0` |
| Weekly | `SUBSCRIPTION` | `WEEKLY` | Recurring |
| Monthly | `SUBSCRIPTION` | `MONTHLY` | Recurring |
| Yearly | `SUBSCRIPTION` | `YEARLY` | Often discounted vs 12× monthly |
| Lifetime | `ONE_TIME` | — | `expiresAt` null on grant |

## Checkout flow

```
Learner selects plan → POST /checkout/course-plan → Stripe Checkout Session → redirect
                                                              │
                              Stripe webhook ◄────────────────┘
                                      │
                    BillingFulfillmentService
                                      │
              UserPurchase / UserSubscription + CourseAccess
```

**Rules enforced in `CheckoutService`:**

- Plan must be active and belong to a `PUBLISHED` course
- Free plans cannot checkout
- `priceCents` must be > 0
- Subscription plans must have valid `billingInterval`
- Stripe Price created lazily and stored on `AccessPlan.stripePriceId`

## Subscription lifecycle

| Event | System response |
|-------|-----------------|
| `checkout.session.completed` | Create subscription row; grant access |
| `invoice.paid` | Extend `currentPeriodEnd`; confirm grant |
| `invoice.payment_failed` | Status → `PAST_DUE`; access lapses on resolution |
| `customer.subscription.updated` | Sync period dates and status |
| `customer.subscription.deleted` | Status → `CANCELED`; access ends per policy |

Webhook processing uses `ProcessedStripeEvent` for **idempotency** — duplicate events do not double-grant.

## Access during billing transitions

`AccessService` links grants to subscriptions:

- Grant is skipped if linked `UserSubscription` is not in `ACTIVE` or `TRIALING`
- `currentPeriodEnd` must be in the future

This means **access is subscription-state-aware**, not merely "once subscribed, always subscribed."

## Cancellation policy (default)

Aligned with standard SaaS practice (configurable later):

- User cancels → subscription remains active until end of paid period
- No refund of current period unless support intervention
- After period end → grant expires naturally via subscription resolution

Document exact policy in Terms of Service before launch.

## One-time vs subscription: when creators choose what

| Creator goal | Recommended plan |
|--------------|------------------|
| Maximum upfront cash | Lifetime / VIP one-time |
| Ongoing community funding | Monthly subscription |
| Annual bundle discount | Yearly subscription |
| Top of funnel | Free + preview lessons |

SmartKlass does not mandate plan mix — creators can offer all five simultaneously.

## Revenue recognition (operational note)

| Type | Recognition pattern |
|------|---------------------|
| One-time | Point-in-time on `PurchaseStatus.COMPLETED` |
| Monthly sub | Spread across billing period |
| Yearly sub | Spread across 12 months or recognized monthly internally |

Finance implementation is outside application code, but **`Payment.amountCents` and `UserPurchase.purchasedAt`** are the export points for accounting tools.

## Platform subscription (future)

To add "SmartKlass Plus" cross-course access:

1. Introduce platform-level `AccessPlan` not tied to single `courseId` **or** bundle plan that grants multiple courses
2. Fulfillment writes multiple `CourseAccess` rows or a new `PlatformAccess` table
3. **Do not** add a `SUBSCRIBER` role — reuse entitlement resolution

Estimated complexity: medium — mostly product and fulfillment, not a new auth paradigm.

## Metrics

| Metric | Definition |
|--------|------------|
| MRR | Sum of active monthly-equivalent subscription prices per course |
| Churn | Canceled subs / active subs in period |
| ARPU | Revenue / active learners per course |
| Conversion | Checkout started → `checkout.session.completed` |

Creator Studio revenue page surfaces these for creator motivation; internal BI should aggregate from `Payment` + `UserSubscription`.

## Related documentation

- [Subscriber access model](./subscriber-access-model.md)
- [Architecture: payments](../architecture/payments.md)
- [ADR-005: Stripe for payments](../adr/ADR-005-stripe-for-payments.md)
