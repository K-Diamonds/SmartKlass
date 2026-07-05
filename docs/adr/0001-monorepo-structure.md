# ADR-0001: Monorepo with pnpm Workspaces

## Status

Accepted

## Context

SmartKlass needs a web frontend, a backend API, shared types, a UI component library, and a database layer. These must stay in sync as the product evolves.

## Decision

Use a **pnpm workspace monorepo** with the following layout:

- `apps/web` — Next.js
- `apps/api` — NestJS
- `packages/database` — Prisma + MySQL
- `packages/shared` — shared types and constants
- `packages/ui` — shared React components

## Consequences

**Positive**

- Single repository for coordinated changes across frontend and backend
- Shared TypeScript types without publishing to npm
- Unified linting, formatting, and dependency management

**Negative**

- Larger repository clone size
- Requires discipline around package boundaries

## Alternatives Considered

- **Polyrepo:** Rejected — too much overhead for a small team at this stage
- **Turborepo/Nx:** Deferred — pnpm workspaces are sufficient for the initial scaffold
