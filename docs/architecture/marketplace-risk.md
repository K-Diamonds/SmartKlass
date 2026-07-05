# Marketplace risk engine

SmartKlass separates **learner checkout risk** from **creator payout risk**. The admin/risk module gives staff a single operational surface for trust tiers, payout policy, disputes, and manual reviews.

## Components

| Component | Purpose |
|-----------|---------|
| `CreatorRiskProfile` | Per-creator trust tier, payout delay override, refund/dispute rates |
| `CreatorRiskEvent` | Timeline of risk signals (flags, suspensions, hold extensions) |
| `AdminAuditLog` | Immutable record of every staff action |
| `FraudRule` | Configurable thresholds (refund rate, dispute rate, large charges) |
| `FeatureFlag` | Gradual rollout and kill switches for marketplace features |

## Trust tiers and payout policy

Payout holds are applied in **two layers**:

1. **Stripe Connect** — `balanceSettings.payments.settlement_timing.delay_days_override`
2. **Internal ledger** — `CreatorTransaction.availableAt` on each sale

| Trust level | Default hold | Admin override |
|-------------|--------------|----------------|
| `NEW` / `STANDARD` | 30 days | — |
| `TRUSTED` | 14 days | 7 or 14 days |
| `HIGH_RISK` | 45 days | 45 or 60 days |
| `SUSPENDED` | No payouts | Checkout blocked; Stripe sync skipped |

Policy resolution lives in `@smartklass/shared` (`resolvePayoutDelayDays`) and is enforced by `CreatorPayoutPolicyService` in the billing module.

## Admin dashboard metrics

`GET /admin/dashboard/*` exposes:

- Platform revenue (sum of `platformFeeCents`)
- GMV (succeeded `Payment.amountCents`)
- Creator earnings (`creatorNetCents`)
- Pending vs available ledger balances
- Refunds, open disputes, failed payouts
- Top creators and suspicious creators (risk profile filters)
- Recent payments

## Staff actions

All routes under `/admin` require `StaffGuard` (env allowlist) and `AdminRateLimitGuard`.

| Action | Endpoint |
|--------|----------|
| Suspend creator | `POST /admin/creators/:id/suspend` |
| Mark trusted | `POST /admin/creators/:id/trust` |
| Mark high risk | `POST /admin/creators/:id/high-risk` |
| Extend payout hold | `POST /admin/creators/:id/extend-payout-hold` |
| Revoke course access | `POST /admin/course-access/revoke` |
| Approve refund (manual review) | `POST /admin/refunds/:id/approve` |
| Flag transaction | `POST /admin/transactions/:id/flag` |
| Internal note | `POST /admin/creators/:id/notes` |
| Chargeback evidence | `PATCH /admin/disputes/:id/evidence` |

Each action writes an `AdminAuditLog` row with `before` / `after` JSON snapshots.

## Manual refund review

Refunds are created from Stripe webhooks (`refund.*`, `charge.refunded`). Staff use **approve refund** to record manual review completion (`adminApprovedAt`, `adminApprovedByUserId`) without re-processing the Stripe refund.

## Chargeback evidence workflow

`Dispute` rows track `evidenceNotes`, `evidenceSubmittedAt`, and `assignedAdminUserId`. Staff update evidence via the admin API; audit logs capture each change.

## Configuration

```env
STAFF_USER_IDS=user_cuid_1,user_cuid_2
STAFF_EMAILS=ops@smartklass.com
ADMIN_RATE_LIMIT_MAX=120
ADMIN_RATE_LIMIT_WINDOW_MS=60000
```

## Related docs

- [Reconciliation](./reconciliation.md)
- [Admin operations](./admin-operations.md)
- [ADR-006](../adr/ADR-006-marketplace-risk-engine.md)
