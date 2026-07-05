# ADR-002: MySQL with Prisma

## Status

**Accepted** — 2026

## Context

SmartKlass needs a relational model for users, courses, ordered curriculum, purchases, subscriptions, and an entitlement ledger (`course_access`). We require:

- ACID transactions for payment fulfillment
- Migration workflow shared across developers
- Type-safe queries in TypeScript
- Hosting options compatible with seed-stage budget

## Decision

Use **MySQL 8.4** as the system of record with **Prisma** as the ORM, centralized in `packages/database`.

- Schema: `packages/database/prisma/schema.prisma`
- Migrations: `packages/database/prisma/migrations/`
- Generated client: `@smartklass/database` workspace package
- Local dev: Docker Compose MySQL

## Consequences

### Positive

- **Mature ecosystem** — broad managed hosting (RDS, Railway, PlanetScale-compatible workflows)
- **Prisma DX** — typed queries, migration history, schema as documentation
- **Monorepo alignment** — API imports client; web does not touch DB
- **Relational fit** — foreign keys enforce purchase → plan → course integrity

### Negative

- `prisma generate` step in CI and local dev
- MySQL lacks some PostgreSQL JSON ergonomics (acceptable for our JSON usage volume)
- Connection pool tuning required at scale (see scaling plan)

### Operational

- Soft deletes via `deletedAt` — queries must consistently filter
- Enum changes require migrations — plan backward compatibility

## Alternatives considered

| Alternative | Verdict |
|-------------|---------|
| PostgreSQL + Prisma | Strong alternative; MySQL chosen for team familiarity and hosting options at decision time |
| PostgreSQL + Drizzle | Less mature tooling for migration review in team workflow |
| MongoDB | Poor fit for entitlement FK graph and checkout transactions |
| Supabase as primary app DB | Couples auth + DB; we own JWT auth separately |

## Invariants

1. Only `apps/api` imports `@smartklass/database`
2. No raw SQL without review
3. Financial tables use `onDelete: Restrict` where appropriate

## References

- [Database design](../architecture/database-design.md)
- Legacy record: [0002-mysql-prisma.md](./0002-mysql-prisma.md) (superseded numbering)
