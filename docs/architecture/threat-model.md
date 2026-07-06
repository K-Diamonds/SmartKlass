# Threat model (STRIDE-lite)

SmartKlass marketplace threat model for engineering and security review.

## Assets

| Asset | Sensitivity |
|-------|-------------|
| User credentials / JWT | High |
| Payment + ledger data | Critical |
| Creator Connect accounts | Critical |
| Course content (YouTube URLs) | Medium |
| Admin audit logs | High |

## Threats & mitigations

| Threat | Category | Mitigation |
|--------|----------|------------|
| Stolen JWT | Spoofing | Short TTL, refresh rotation, HTTPS only |
| Webhook replay | Spoofing | Stripe signature verify + `processed_stripe_events` idempotency |
| IDOR on `/courses/:id/watch` | Elevation | `RequireCourseAccessGuard` + grant ledger |
| Staff privilege escalation | Elevation | RBAC + env allowlist break-glass |
| SQL injection | Tampering | Prisma parameterized queries |
| Mass refund | Tampering | Refund request workflow (approve ≠ execute) |
| Ledger manipulation | Tampering | Webhook-sourced Stripe mirrors; admin audit |
| PII in logs | Info disclosure | Structured logs; no JWT/email in hot path |
| Admin API abuse | DoS | Redis/in-memory rate limits |
| Creator suspension bypass | DoS | Checkout blocked at `SUSPENDED` trust tier |

## Trust boundaries

```
Internet → CDN/Web → API (JWT) → MySQL
                 → Stripe (webhooks, signed)
                 → Admin (RBAC + rate limit)
```

## Open items

| Item | Priority |
|------|----------|
| WAF / DDoS (Cloudflare) | Before high traffic |
| Secret rotation runbook | Q3 |
| Penetration test | Before Series A / enterprise sales |
| CSP headers on web | Medium |

## Related

- [Security](./security.md)
- [Admin RBAC](./admin-rbac.md)
- [Disaster recovery](./disaster-recovery.md)
