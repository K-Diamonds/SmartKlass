# ADR-005: Stripe Connect Marketplace Payments

## Status

**Accepted** — 2026 (supersedes Connect-as-future language in prior payment ADR)

## Context

SmartKlass monetizes course access through:

- One-time plans (`ONE_TIME`)
- Recurring plans (`SUBSCRIPTION`)

Creators are independent merchants on the platform. SmartKlass must:

1. Collect a **20% platform fee** (or **$5 minimum**)
2. Route the creator share to creator bank accounts
3. Hold earnings through a **30-day refund/dispute window**
4. Maintain **audit-safe ledger rows** for support and finance
5. Handle refunds, disputes, and payout failures via webhooks

PCI scope must stay at SAQ A (Stripe Checkout hosts card data).

## Decision

Use **Stripe Connect Express** with **destination charges** as the v1 marketplace payment architecture.

### Charge split

| Plan type | Platform fee mechanism | Creator transfer |
|-----------|------------------------|------------------|
| `ONE_TIME` | `application_fee_amount` | `transfer_data.destination` |
| `SUBSCRIPTION` | `application_fee_percent` | `transfer_data.destination` |

### Payout timing

Configure connected accounts with `delay_days: 30`. Stripe automatically pays out to creator bank accounts after the hold.

Internally, `CreatorTransaction.availableAt = paidAt + 30 days` and status `PENDING` until matured to `AVAILABLE`.

### Ledger tables (MySQL)

| Table | Role |
|-------|------|
| `creator_transactions` | Per-charge audit record |
| `creator_payouts` | Stripe payout mirror |
| `refunds` | Refund mirror |
| `disputes` | Dispute mirror |

`creator_profiles.available_balance_cents` is **not** the course revenue ledger — certificate wallet only.

### Webhook idempotency

`processed_stripe_events` stores Stripe `event.id` before side effects.

### Metadata

All `Payment.metadata` updates **merge** JSON — never overwrite fee fields set at checkout.

## Consequences

### Positive

- Creators receive funds directly on Connect accounts
- Platform fee collected automatically per charge
- Stripe handles KYC, tax forms (1099 path), and bank payouts
- Internal ledger supports support tickets and finance audits
- Refund/dispute webhooks keep ledger consistent

### Negative

- Creators must complete Connect onboarding before selling
- Stripe Connect fees apply in addition to platform fee
- 30-day hold is Stripe-configured — not a custom escrow UI
- Destination charge refund behavior requires careful webhook testing

### Not in v1

- Manual payout approval workflow
- Platform-held escrow with operator release
- Grandfathering price changes automatically

## Alternatives considered

| Alternative | Rejected because |
|-------------|------------------|
| Platform-collect then periodic transfer | Worse creator trust; more liability on platform balance |
| Separate MoR (Paddle) | Shifts tax burden; off-brand for creator marketplace |
| `available_balance_cents` increment on sale | Not audit-safe; no refund/dispute linkage |
| Manual 30-day cron payout job | Duplicates Stripe Connect `delay_days` |

## Implementation map

| Component | Path |
|-----------|------|
| Checkout + Connect | `apps/api/src/modules/billing/checkout.service.ts` |
| Connect onboarding | `apps/api/src/modules/billing/creator-billing.service.ts` |
| Fulfillment | `apps/api/src/modules/billing/billing-fulfillment.service.ts` |
| Ledger | `apps/api/src/modules/billing/marketplace-accounting.service.ts` |
| Webhooks | `apps/api/src/modules/billing/stripe-webhook.service.ts` |
| Fee constants | `packages/shared/src/platform-fees.ts` |

## Environment

| Variable | Purpose |
|----------|---------|
| `STRIPE_SECRET_KEY` | API |
| `STRIPE_WEBHOOK_SECRET` | Webhook verification |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Web |

## References

- [Payments architecture](../architecture/payments.md)
- [Stripe Connect](../architecture/stripe-connect.md)
- [Creator payouts](../architecture/creator-payouts.md)
- [ADR-005 (legacy Stripe Checkout)](./ADR-005-stripe-for-payments.md)
