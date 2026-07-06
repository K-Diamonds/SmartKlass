# ADR-007: Admin RBAC

**Status:** Accepted  
**Date:** 2026-07-05  
**Deciders:** Engineering  
**Supersedes:** Staff-only env allowlist described in [ADR-006](./ADR-006-marketplace-risk-engine.md)

## Context

ADR-006 shipped admin APIs protected by `STAFF_EMAILS` / `STAFF_USER_IDS` and in-memory rate limiting. As the ops team grows, we need:

- Separation of duties (risk vs finance vs support)
- Permission checks on every admin mutation
- A path to Redis-backed rate limits across API instances

## Decision

Add database RBAC to the existing `admin-risk` module:

1. **Schema** — `AdminRole`, `AdminPermission`, `AdminUserRole`, `AdminRolePermission` with enum `AdminRoleKey`
2. **Five roles** — `SUPER_ADMIN`, `RISK_ANALYST`, `FINANCE`, `SUPPORT`, `READ_ONLY`
3. **Guards** — `AdminPermissionGuard` + `@RequireAdminPermissions(...)` on handlers
4. **Legacy bypass** — env allowlist users still pass the guard (bootstrap + break-glass)
5. **Rate limiting** — `RATE_LIMIT_STORE` abstraction with `RedisRateLimitStore` and `InMemoryRateLimitStore` fallback when `REDIS_URL` is unset

## Permission examples

- `admin:refunds:execute` — FINANCE, SUPER_ADMIN only
- `admin:creators:write` — RISK_ANALYST, SUPER_ADMIN
- `admin:reconciliation:run` — FINANCE, SUPER_ADMIN

Full matrix: `admin-permissions.constants.ts`.

## Consequences

**Positive**

- Finance cannot suspend creators; risk cannot execute Stripe refunds without explicit permission
- Horizontal scaling of admin rate limits when Redis is configured
- Audit remains unchanged; RBAC is orthogonal

**Negative**

- Migration and seed required on deploy
- Env allowlist must be tightened over time to avoid dual auth paths

## Alternatives considered

| Alternative | Why not |
|-------------|---------|
| External IAM (Auth0 roles) | Extra vendor coupling; staff are app users today |
| Keep env allowlist only | No separation of duties at scale |

## Related

- [admin-rbac.md](../architecture/admin-rbac.md)
