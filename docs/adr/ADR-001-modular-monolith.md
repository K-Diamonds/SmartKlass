# ADR-001: Modular Monolith

## Status

**Accepted** — 2026

## Context

SmartKlass requires a backend that supports authentication, catalog management, entitlement resolution, Stripe billing, and webhooks. The engineering team is small. Operational overhead must stay low through product-market fit.

We needed to choose between:

- A single deployable application with internal module boundaries
- Microservices from day one
- Splitting backend logic across Next.js API routes and NestJS

## Decision

Build **`apps/api` as a NestJS modular monolith**:

- One process, one deployment artifact
- Feature boundaries enforced by NestJS modules and export rules
- Shared `AccessService` and `PrismaModule` in `common/`
- Horizontal scale by running multiple instances behind a load balancer

## Consequences

### Positive

- **Atomic transactions** — purchase + `CourseAccess` grant in one DB transaction
- **Fast iteration** — one PR can ship catalog + billing changes
- **Simple ops** — one log stream, one health check, one rollback
- **Clear hiring story** — engineers onboard to one codebase with ADR guidance

### Negative

- All modules share fate during deploy (mitigated by tests + feature flags)
- Resource-heavy endpoints (webhooks) share CPU with read traffic until extracted
- Discipline required to avoid cross-module spaghetti

### Neutral

- Extraction path documented in [modular-monolith.md](../architecture/modular-monolith.md) when triggers fire

## Alternatives considered

| Alternative | Rejected because |
|-------------|------------------|
| Microservices | Ops cost exceeds team size; distributed transactions for grants |
| Next.js API routes as backend | Splits domain logic; weaker module boundaries; Prisma in serverless cold starts |
| Serverless functions per domain | Poor fit for Stripe webhooks and connection pooling |

## Compliance

New features must:

1. Live in a named NestJS module
2. Not import non-exported providers from other modules
3. Route money side effects through `BillingModule`

## References

- [Architecture overview](../architecture/overview.md)
- [Scaling plan](../architecture/scaling-plan.md)
