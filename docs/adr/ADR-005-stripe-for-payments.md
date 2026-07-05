# ADR-005: Stripe for Payments

## Status

**Accepted** — 2026

## Context

SmartKlass monetizes through:

- One-time course plans (`ONE_TIME` — lifetime, VIP positioning)
- Recurring course plans (`SUBSCRIPTION` — monthly, yearly)

Requirements:

- PCI compliance without storing card data
- Subscription lifecycle sync (renewal, failure, cancel)
- Webhook-driven fulfillment to `CourseAccess`
- Idempotent processing under Stripe retries
- Developer velocity for seed team

## Decision

Use **Stripe Checkout** and **Stripe webhooks** as the payment system of record for money movement.

Implementation in `apps/api/src/modules/billing/`:

| Component | Role |
|-----------|------|
| `CheckoutService` | Create Checkout Sessions; lazy-create Stripe Prices |
| `StripeWebhookService` | Verify signatures; route events |
| `BillingFulfillmentService` | Mirror state in MySQL; grant access |
| `ProcessedStripeEvent` | Idempotency by Stripe event ID |

Checkout modes:

- `payment` for `ONE_TIME` plans
- `subscription` for `SUBSCRIPTION` plans

`FREE` plans bypass Stripe — fulfilled directly (planned symmetry with paid grants).

## Consequences

### Positive

- **PCI SAQ A scope** — Stripe hosts payment UI
- **Battle-tested subscriptions** — dunning, invoices, customer portal path
- **Investor familiarity** — standard fintech stack narrative
- **Webhook idempotency** — financial correctness under retries

### Negative

- Stripe fees reduce creator margin — disclose in creator agreement
- Platform Stripe account in v1 — Connect payout work remains
- Test mode / live mode discipline required across environments
- Vendor lock-in — acceptable at seed stage

### Technical

- `rawBody: true` on Nest bootstrap — mandatory for webhook signatures
- `stripePriceId` cached on `AccessPlan` — price changes need new Price objects

## Alternatives considered

| Alternative | Rejected because |
|-------------|------------------|
| PayPal only | Weaker subscription primitives for our model |
| Paddle / Lemon Squeezy | Merchant of record shifts tax complexity — defer |
| Self-built card form + Stripe Elements | More PCI surface; Checkout faster to ship |
| Crypto | Off-brand for premium learning marketplace |

## Future: Stripe Connect

**Implemented in v1.** See [ADR-005: Stripe Connect marketplace payments](./ADR-005-stripe-connect-marketplace-payments.md) and [Stripe Connect architecture](../architecture/stripe-connect.md).

Creator payouts use **Stripe Connect Express** with destination charges and a 30-day payout delay.

## Environment

| Variable | Purpose |
|----------|---------|
| `STRIPE_SECRET_KEY` | Server API |
| `STRIPE_WEBHOOK_SECRET` | Webhook verification |

Missing keys → checkout and webhooks fail closed.

## References

- [Payments architecture](../architecture/payments.md)
- [Subscription model](../product/subscription-model.md)
- [Security](../architecture/security.md)
