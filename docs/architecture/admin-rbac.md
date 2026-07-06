# Admin RBAC

SmartKlass admin APIs use database-backed role-based access control (RBAC) layered on top of the legacy staff env allowlist.

## Models

| Model | Purpose |
|-------|---------|
| `AdminRole` | Named role (`SUPER_ADMIN`, `RISK_ANALYST`, `FINANCE`, `SUPPORT`, `READ_ONLY`) |
| `AdminPermission` | Fine-grained permission key (e.g. `admin:refunds:execute`) |
| `AdminUserRole` | Assigns roles to users |
| `AdminRolePermission` | Maps roles → permissions |

## Roles

| Role | Typical use |
|------|-------------|
| `SUPER_ADMIN` | Full access; seeded for `STAFF_EMAILS` / `STAFF_USER_IDS` on boot |
| `RISK_ANALYST` | Creator risk, transaction flags, dispute updates, refund requests |
| `FINANCE` | Refund approve/deny/execute, reconciliation runs |
| `SUPPORT` | Read-mostly + refund requests + dispute evidence |
| `READ_ONLY` | Metrics and ledger visibility only |

Permission matrix is defined in `apps/api/src/modules/admin-risk/admin-permissions.constants.ts`.

## Authorization flow

```
Request → AdminPermissionGuard
  ├─ Legacy staff (env allowlist)? → allow
  └─ Else require @RequireAdminPermissions(...) on handler
       └─ AdminRbacService.getUserPermissions(userId)
```

- `GET /admin/me/permissions` returns the caller's roles and permission keys.
- `AdminRateLimitGuard` applies per-actor limits via Redis (or in-memory fallback).

## Bootstrapping

On module init, `AdminRbacService`:

1. Upserts all roles and permissions from constants
2. Assigns `SUPER_ADMIN` to users matching `STAFF_EMAILS` or `STAFF_USER_IDS`

For production, prefer explicit `AdminUserRole` rows over env allowlist alone.

## Web

Admin UI calls `verifyAdminAccess()` via `GET /admin/me/permissions`. Action buttons should be gated by permission keys returned from that endpoint.

## Related

- [ADR-007](../adr/ADR-007-admin-rbac.md)
- [Admin operations](./admin-operations.md)
