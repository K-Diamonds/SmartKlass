# Admin operations

Internal APIs for SmartKlass staff. All routes are prefixed with `/admin` and require authentication plus staff allowlist.

## Authentication

1. Staff user logs in normally (`POST /auth/login`).
2. JWT must belong to a user in `STAFF_USER_IDS` or `STAFF_EMAILS`.
3. `StaffGuard` evaluates the **actor** (`impersonatorId` when impersonating, otherwise `user.id`).

## Rate limiting

`AdminRateLimitGuard` applies an in-memory per-actor, per-IP token bucket (default 120 requests / 60s). Tune via:

```env
ADMIN_RATE_LIMIT_MAX=120
ADMIN_RATE_LIMIT_WINDOW_MS=60000
```

## Admin impersonation

Staff can obtain a short-lived (15m) access token for a target user:

```http
POST /admin/users/:userId/impersonate
{ "reason": "Support ticket #1234" }
```

The token includes `impersonatorId` and `impersonatorEmail` claims. Admin routes still authorize the impersonator, not the impersonated user.

## Webhook replay

Processed events are tracked in `processed_stripe_events`.

| Step | Endpoint |
|------|----------|
| List events | `GET /admin/webhooks/stripe/processed` |
| Queue replay | `POST /admin/webhooks/stripe/:eventId/mark-replay` |
| Replay safely | `POST /admin/webhooks/stripe/:eventId/replay` |

Replay fetches the event from Stripe (`events.retrieve`) and re-dispatches handlers. Idempotency:

- Default: skip if event id already exists in `processed_stripe_events`
- `force: true`: re-run handlers (safe when handlers upsert / find-first)

Replay metadata: `replayRequestedAt`, `lastReplayedAt`, `replayCount`.

## Feature flags

```http
GET  /admin/feature-flags
PATCH /admin/feature-flags/:key
{ "enabled": true, "config": { "rolloutPercent": 10 } }
```

Use flags for gradual marketplace rollouts (e.g. new checkout flow, stricter fraud checks).

## Fraud rules

Default rules can be seeded:

```http
POST /admin/fraud-rules/seed
GET  /admin/fraud-rules
```

Rules are JSON-configured (`threshold`, `action`) and evaluated by risk workflows.

## Audit logs

```http
GET /admin/audit-logs?targetType=CREATOR_PROFILE&targetId=...
```

Every admin mutation records:

- `actorUserId`, `action`, `targetType`, `targetId`
- `before`, `after`, `reason`, `ipAddress`, `createdAt`

## Terms, refunds, and tax notes

**Refund policy (operational):**

- Learner refunds flow through Stripe; ledger moves to `REFUNDED` via webhooks.
- Staff **approve refund** marks manual review only; it does not initiate a new Stripe refund.
- High-risk creators may have `manualReviewRequired` for payout and refund review queues.

**Tax / compliance (v1):**

- Creators are paid via Stripe Connect Express; tax forms (1099-K, etc.) are handled by Stripe where applicable.
- Platform collects application fees on destination charges; consult your accountant for marketplace sales tax obligations by jurisdiction.
- Document creator verification tiers (`isVerified` on `CreatorProfile` + `CreatorRiskProfile.trustLevel`) for KYC escalation.

## API index

| Area | Base path |
|------|-----------|
| Dashboard | `/admin/dashboard/*` |
| Creator risk | `/admin/creators/:id/*` |
| Refunds / disputes | `/admin/refunds/*`, `/admin/disputes/*` |
| Reconciliation | `/admin/reconciliation/*` |
| Webhooks | `/admin/webhooks/stripe/*` |
| Flags / fraud | `/admin/feature-flags`, `/admin/fraud-rules` |
| Impersonation | `/admin/users/:id/impersonate` |
| Audit | `/admin/audit-logs` |
