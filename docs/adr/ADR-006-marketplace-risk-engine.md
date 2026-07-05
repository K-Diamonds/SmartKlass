# ADR-006: Marketplace risk engine and admin operations

**Status:** Accepted  
**Date:** 2026-07-05  
**Deciders:** Engineering  
**Supersedes:** None (extends [ADR-005](./ADR-005-stripe-connect-marketplace-payments.md))

## Context

SmartKlass had a working Stripe Connect marketplace with a fixed 30-day payout hold and ledger tables, but no staff tooling for risk, reconciliation, or operational overrides. As GMV grows, we need:

- Dynamic payout policy by creator trust tier
- Admin dashboard and audit trail
- Stripe ↔ ledger reconciliation
- Safe webhook replay
- Feature flags and rate limiting for internal APIs

## Decision

Introduce an **Admin/Risk module** (`apps/api/src/modules/admin-risk`) with:

1. **Creator risk profiles** — `CreatorRiskProfile`, `CreatorRiskEvent`, trust tiers (`NEW`, `STANDARD`, `TRUSTED`, `HIGH_RISK`, `SUSPENDED`)
2. **Dynamic payout policy** — shared `resolvePayoutDelayDays()`; billing services read per-creator delay instead of hardcoding 30 days
3. **Admin audit logs** — `AdminAuditLog` on every staff mutation
4. **Reconciliation reports** — async job comparing local payments/ledger to Stripe charges, fees, transfers, payouts
5. **Webhook replay** — list/mark/replay `processed_stripe_events` with idempotency controls
6. **Staff auth** — env allowlist (`STAFF_USER_IDS`, `STAFF_EMAILS`) + rate limiting; no new DB role table in v1
7. **Impersonation** — short-lived JWT with `impersonatorId` claim for support

## Trust tier payout matrix

| Tier | Default delay | Payouts allowed |
|------|---------------|-----------------|
| NEW / STANDARD | 30d | Yes |
| TRUSTED | 14d (7/14 override) | Yes |
| HIGH_RISK | 45d (45/60 override) | Yes, manual review flag |
| SUSPENDED | — | No (checkout blocked) |

Both Stripe Connect `delay_days_override` and `CreatorTransaction.availableAt` use the resolved delay.

## Consequences

**Positive**

- Staff can respond to fraud/disputes without direct DB access
- Audit trail supports compliance and incident review
- Reconciliation surfaces drift before month-end close
- Trusted creators can receive faster payouts (7/14d)

**Negative / trade-offs**

- Staff allowlist in env is coarse; RBAC roles can be added later
- Reconciliation pagination is capped at 100 objects per Stripe list call in v1
- In-memory admin rate limit does not span multiple API instances (use Redis later if needed)

## Alternatives considered

| Alternative | Why not (for v1) |
|-------------|------------------|
| Full RBAC schema (`Role`, `Permission`) | Slower to ship; env allowlist sufficient for small ops team |
| Single 30-day hold for all creators | Does not meet risk-tier requirements |
| Manual SQL for reconciliation | Error-prone; not repeatable |

## References

- [marketplace-risk.md](../architecture/marketplace-risk.md)
- [reconciliation.md](../architecture/reconciliation.md)
- [admin-operations.md](../architecture/admin-operations.md)
- [stripe-connect.md](../architecture/stripe-connect.md)
