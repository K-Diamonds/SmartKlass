# Architecture Overview

## System context

SmartKlass is a **pnpm monorepo** delivering a premium course marketplace: learners discover and pay for structured curricula; creators organize YouTube-hosted lessons and configure access plans; the platform enforces entitlements and processes payments.

```
                    ┌──────────────────────────────────────────┐
                    │              Learners / Creators          │
                    └────────────────────┬─────────────────────┘
                                         │ HTTPS
                    ┌────────────────────▼─────────────────────┐
                    │           apps/web (Next.js 16)           │
                    │  Public · Learn · Dashboard · Studio      │
                    └────────────────────┬─────────────────────┘
                                         │ REST /api/v1
                    ┌────────────────────▼─────────────────────┐
                    │           apps/api (NestJS 11)            │
                    │     Modular monolith — see ADR-001        │
                    └───────┬─────────────────────┬────────────┘
                            │                     │
              ┌─────────────▼─────────┐   ┌───────▼────────┐
              │  packages/database    │   │ Stripe webhooks │
              │  Prisma → MySQL 8.4   │   │ YouTube (embed) │
              └───────────────────────┘   └────────────────┘
```

## Repository layout

```
smartklass/
├── apps/
│   ├── web/                 # Next.js App Router — BFF consumer, not BFF server
│   └── api/                 # NestJS REST API — all business logic
├── packages/
│   ├── database/            # Prisma schema, migrations, generated client
│   ├── shared/              # Cross-package types and constants
│   └── ui/                  # Shared React primitives (optional consumption)
└── docs/                    # Product, architecture, ADRs
```

## Runtime boundaries

| Application | Port (dev) | Responsibility |
|-------------|------------|----------------|
| `apps/web` | 3000 | Rendering, client-side auth token, UX |
| `apps/api` | 4000 | Auth, catalog, access, billing, webhooks |
| MySQL | 3306 | System of record |

The web app talks to the API over HTTP (`NEXT_PUBLIC_API_URL`). We do not embed Prisma in Next.js route handlers for domain logic — **the API owns transactions**.

## API surface

- **Prefix:** `/api/v1`
- **Auth:** JWT Bearer token; global guard with `@Public()` exceptions
- **Validation:** `class-validator` DTOs, whitelist mode
- **Errors:** `GlobalExceptionFilter` — consistent HTTP shape
- **Responses:** `ResponseInterceptor` wrapper for success payloads

## Domain modules (NestJS)

| Module | Domain |
|--------|--------|
| `AuthModule` | Register, login, JWT issuance |
| `UsersModule` | Profiles |
| `CreatorsModule` | Creator profiles, public pages |
| `CoursesModule` | Course CRUD, publish, watch |
| `CourseModulesModule` | Module CRUD, reorder |
| `LessonsModule` | Lesson CRUD, YouTube attach, resources |
| `AccessPlansModule` | Per-course pricing plans |
| `BillingModule` | Checkout, webhooks, fulfillment |
| `PurchasesModule` / `SubscriptionsModule` | Learner billing history |
| `YoutubeModule` | URL validation, oEmbed helpers |
| `AccessModule` (common) | `AccessService`, guards |

Cross-cutting: `PrismaModule`, `ConfigModule` with environment validation, `RequestLoggingMiddleware`.

## Web application structure

| Route group | Audience | Notes |
|-------------|----------|-------|
| `(public)` | Anonymous + SEO | Discover, course landing, auth |
| `(user)` | Authenticated learners | Library, subscriptions, billing |
| `(learn)` | Entitled learners | Watch UI — consumes watch APIs only |
| `(studio)` | Creators | Creator Studio — API wiring in progress |

## Data flow: watch a lesson

```
1. Browser holds JWT
2. GET /lessons/:id/watch with Authorization header
3. RequireLessonAccessGuard → AccessService.canViewLesson()
4. If entitled → LessonWatchDto with youtube.embedUrl + resources
5. YouTubeEmbed component renders iframe
```

Access checks happen **once per request** on the server. The iframe is public CDN; the curriculum structure is not.

## Data flow: purchase a course

```
1. POST /checkout/course-plan { accessPlanId }
2. CheckoutService creates Stripe Checkout Session
3. User completes payment on Stripe-hosted page
4. Webhook → StripeWebhookService (idempotent)
5. BillingFulfillmentService writes Purchase/Subscription + CourseAccess
6. User returns to web → library shows course
```

## Shared packages strategy

| Package | Consumers | Rule |
|---------|-----------|------|
| `@smartklass/database` | API only (web never imports) | Schema is backend-owned |
| `@smartklass/shared` | API + web | DTOs, enums safe for client |
| `@smartklass/ui` | Web | Presentational components |

## Deployment topology (target)

| Tier | Recommendation |
|------|----------------|
| Web | Vercel or containerized Next.js behind CDN |
| API | Container (Fly.io, ECS, Railway) behind load balancer |
| DB | Managed MySQL (RDS, PlanetScale, Railway) |
| Secrets | JWT secret, Stripe keys — never in client bundle |

`rawBody: true` on Nest bootstrap is required for Stripe webhook signature verification.

## Quality attributes

| Attribute | Approach |
|-----------|----------|
| **Security** | JWT, bcrypt, access guards, webhook signatures — [security.md](./security.md) |
| **Scalability** | Modular monolith first — [scaling-plan.md](./scaling-plan.md) |
| **Maintainability** | ADRs, single AccessService, Prisma migrations |
| **Observability** | Request logging, health module — [observability.md](./observability.md) |
| **Testability** | Jest unit tests on AccessService, billing, guards |

## Key architectural invariants

1. **Entitlements, not roles** — access decisions go through `AccessService`
2. **YouTube links, not files** — no video bytes in our storage
3. **Stripe is system of record for money movement** — we mirror state in MySQL
4. **Soft deletes** — `deletedAt` on user-facing entities; hard delete only via cascade rules
5. **Published boundary** — learner-facing reads require `CourseStatus.PUBLISHED` unless owner context

## Documentation map

| Topic | Document |
|-------|----------|
| Monolith structure | [modular-monolith.md](./modular-monolith.md) |
| Schema | [database-design.md](./database-design.md) |
| Authorization | [access-control.md](./access-control.md) |
| Payments | [payments.md](./payments.md) |
| Video | [youtube-embedding.md](./youtube-embedding.md) |
| Growth path | [scaling-plan.md](./scaling-plan.md) |

## Decision log

Formal ADRs live in `docs/adr/`. When proposing a change that violates an invariant above, write a new ADR first.
