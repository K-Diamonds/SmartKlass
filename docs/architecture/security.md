# Security

## Security posture summary

SmartKlass handles **authentication credentials**, **payment orchestration**, and **paid digital goods entitlements**. We are not PCI Level 1 — Stripe hosts card data. Our responsibility is **token security**, **entitlement integrity**, **webhook authenticity**, and **sane defaults**.

Security is layered: edge transport, application authZ, data integrity, and operational hygiene.

## Transport

| Requirement | Implementation |
|-------------|----------------|
| TLS in production | Terminate at load balancer / Vercel |
| HSTS | Configure at edge |
| No secrets in client bundle | Only `NEXT_PUBLIC_*` non-sensitive vars |

## Authentication

| Control | Detail |
|---------|--------|
| Password hashing | bcrypt via `passwordHash` on `User` |
| Session token | JWT access token, configurable expiry (`JWT_EXPIRES_IN`) |
| Global guard | `JwtAuthGuard` — opt-out with `@Public()` |
| Refresh tokens | `JWT_REFRESH_EXPIRES_IN` configured — implement rotation before long-lived mobile clients |

### JWT guidelines

- `JWT_SECRET` ≥ 32 bytes entropy in production; never commit
- Validate `exp`, `iss` if issuer added later
- Do not embed entitlements in JWT claims — grants change without re-login

## Authorization

See [access-control.md](./access-control.md).

Highlights:

- `AccessService` is the only entitlement evaluator for watch paths
- `CourseOwnerGuard` for creator mutations
- 404 vs 403 chosen to reduce enumeration on unpublished content

## Payments security

| Control | Detail |
|---------|--------|
| PCI scope | SAQ A — Stripe Checkout hosted fields |
| Webhook verification | `stripe.webhooks.constructEvent` with raw body |
| Idempotency | `ProcessedStripeEvent` prevents duplicate grants |
| Metadata | User/plan IDs in session metadata — validate on fulfillment |

Never trust client-side "payment succeeded" flags — only webhook + DB grant.

## Input validation

| Layer | Mechanism |
|-------|-----------|
| HTTP DTOs | `class-validator` + global `ValidationPipe` (whitelist, forbid unknown) |
| YouTube URLs | Server-side parse — reject malformed |
| SQL injection | Prisma parameterized queries |

## Data protection

| Data class | Handling |
|------------|----------|
| PII (email, name) | MySQL encrypted at rest via cloud provider |
| Passwords | bcrypt only — never reversible |
| Payment instruments | Not stored |
| Soft delete | `deletedAt` for GDPR workflow staging |

### GDPR / deletion (operational)

Account deletion requires policy for:

- Anonymize vs delete reviews
- Retain purchases for tax law
- Revoke active `CourseAccess`

Document in privacy policy before EU traffic.

## Application hardening

| Item | Status / recommendation |
|------|-------------------------|
| CORS | Restrict to `NEXT_PUBLIC_APP_URL` in production |
| Rate limiting | Add on `/auth/login`, `/checkout/*` before launch |
| CSRF | Less critical for Bearer JWT API; relevant if cookie auth added |
| Dependency scanning | Enable Dependabot / `pnpm audit` in CI |
| Secret rotation | Runbook for JWT + Stripe key rotation |

## Creator / content abuse

| Vector | Mitigation |
|--------|------------|
| Copyright violation | `PENDING_REVIEW` gate; DMCA process |
| Phishing links in resources | URL scheme allowlist in validator |
| Scraping catalog | Rate limits; no bulk export API |

## Infrastructure

| Practice | Notes |
|----------|-------|
| Least privilege DB user | App user without DDL in production |
| Separate Stripe keys per environment | Test vs live |
| No production data in dev | Seed scripts only |

## Incident response (lightweight)

1. **Credential leak** — rotate JWT secret (forces re-login), audit grants
2. **Webhook secret leak** — rotate in Stripe dashboard + env
3. **Suspected fraudulent grants** — query `CourseAccess` + `ProcessedStripeEvent`, revoke `revokedAt`

Maintain contact path for security reports before public launch.

## Security testing

| Type | Coverage |
|------|----------|
| Unit | Access guards, webhook idempotency |
| Integration | Checkout validation paths |
| Manual | OWASP top 10 spot check pre-launch |
| Pen test | Before institutional sales or Series A |

## Related

- [Access control](./access-control.md)
- [Payments](./payments.md)
- [Observability](./observability.md)
