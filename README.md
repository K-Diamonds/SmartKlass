# SmartKlass

**Premium learning marketplace for everyday creators and learners.**

SmartKlass is a SaaS platform inspired by MasterClass and Coursera — built for normal people. Browse expert-led courses, purchase access or subscribe, watch lessons through embedded YouTube videos, and manage courses in Creator Studio.

---

## Product Vision

- **Learners** discover curated courses, pay once or subscribe, and learn at their own pace
- **Creators** teach practical skills using YouTube-hosted videos without expensive streaming infrastructure
- **The platform** handles payments, access control, and catalog curation

See [docs/product/vision.md](docs/product/vision.md) for the full product brief.

---

## Architecture

```
smartklass/
├── apps/
│   ├── web/          # Next.js — public, learner, and creator UI
│   └── api/          # NestJS modular monolith — REST API
├── packages/
│   ├── database/     # Prisma schema & client (MySQL)
│   ├── shared/       # Shared types and constants
│   └── ui/           # Shared React component library
├── docs/
│   ├── architecture/ # System design
│   ├── adr/          # Architecture Decision Records
│   ├── product/      # Product specs
│   └── api/          # API reference
├── docker-compose.yml
└── .env.example
```

| Layer | Technology | Port (dev) |
|-------|------------|------------|
| Frontend | Next.js 16, React 19, Tailwind CSS | 3000 |
| API | NestJS 11 | 4000 |
| Database | MySQL 8.4 via Prisma | 3306 |
| Tooling | TypeScript, ESLint, Prettier, pnpm | — |

See [docs/architecture/overview.md](docs/architecture/overview.md) for detailed architecture notes.

---

## Prerequisites

- [Node.js](https://nodejs.org/) ≥ 20
- [pnpm](https://pnpm.io/) ≥ 9
- [Docker](https://www.docker.com/) (for local MySQL)

---

## Quick start

```bash
git clone <repository-url> smartklass
cd smartklass
cp .env.example .env
pnpm setup          # install, start MySQL, migrate, seed
pnpm dev            # web :3000 + api :4000
```

| Service | URL |
|---------|-----|
| Web | http://localhost:3000 |
| API | http://localhost:4000/api/v1 |
| Health | http://localhost:4000/api/v1/health |

**Production API:** [smart-klass-api.vercel.app](https://smart-klass-api.vercel.app/api/v1/health) — see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for Vercel + GitHub CI/CD (same pattern as CreatorOS / Kortex).

### Seed accounts

All seed users share the password **`password123`**:

| Email | Role |
|-------|------|
| `alex@example.com` | Learner (lifetime pasta access) |
| `jordan@example.com` | Learner (monthly pasta subscription) |
| `maria@example.com` | Creator (Chef Maria Santos) |
| `devon@example.com` | Creator (Devon Brooks) |

---

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm setup` | Install, Docker MySQL, migrate, seed |
| `pnpm dev` | Start web and API in parallel |
| `pnpm dev:web` | Start Next.js only |
| `pnpm dev:api` | Start NestJS only |
| `pnpm build` | Build all packages and apps |
| `pnpm test` | Run API unit tests |
| `pnpm test:e2e` | Run API e2e tests |
| `pnpm lint` | Lint all workspaces |
| `pnpm typecheck` | Type-check all workspaces |
| `pnpm format` | Format code with Prettier |
| `pnpm docker:up` | Start MySQL container |
| `pnpm docker:down` | Stop MySQL container |
| `pnpm db:migrate` | Run Prisma migrations |
| `pnpm db:seed` | Seed sample data |
| `pnpm db:reset` | Reset database, migrate, and seed |
| `pnpm db:studio` | Open Prisma Studio |

---

## Workspace Packages

| Package | Name | Description |
|---------|------|-------------|
| `apps/web` | `@smartklass/web` | Next.js frontend |
| `apps/api` | `@smartklass/api` | NestJS backend |
| `packages/database` | `@smartklass/database` | Prisma + MySQL client |
| `packages/shared` | `@smartklass/shared` | Shared types and constants |
| `packages/ui` | `@smartklass/ui` | Shared React UI components |

---

## Documentation

- [Architecture overview](docs/architecture/overview.md)
- [Product vision](docs/product/vision.md)
- [API reference](docs/api/README.md)
- [ADRs](docs/adr/)

---

## Current Status

| Area | Status |
|------|--------|
| API — auth, courses, lessons, billing, access | Implemented |
| API — categories, favorites, reviews, comments | Scaffolded (501) |
| Web — public pages, learn player, Creator Studio | UI complete; studio uses mock data |
| Web — login/register | Wired to API |
| Stripe checkout | Implemented (requires env keys) |

---

## License

Proprietary. All rights reserved.
