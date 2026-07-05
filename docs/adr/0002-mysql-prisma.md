# ADR-0002: MySQL with Prisma

## Status

Accepted

## Context

SmartKlass requires a relational data model for users, courses, lessons, purchases, and subscriptions. The team wants type-safe database access and migration tooling.

## Decision

Use **MySQL 8.4** as the primary database with **Prisma** as the ORM, centralized in `packages/database`.

## Consequences

**Positive**

- Mature relational database with broad hosting support
- Prisma provides type-safe queries and migration workflow
- Schema is a single source of truth for the data model

**Negative**

- Prisma adds a build/generate step to the development workflow
- MySQL requires running Docker locally (or a remote instance)

## Alternatives Considered

- **PostgreSQL:** Viable alternative; MySQL chosen for familiarity and hosting availability
- **Drizzle ORM:** Considered; Prisma chosen for ecosystem maturity and tooling
