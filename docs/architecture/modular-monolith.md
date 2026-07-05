# Modular Monolith

## Position

SmartKlass runs as a **modular monolith**: one deployable NestJS application (`apps/api`) composed of feature modules with explicit boundaries. We are not running microservices in v1, and we are not planning to split until measurable pain justifies the operational tax.

This document explains how we enforce modularity inside a single process, and when we would extract services.

## Why modular monolith

| Force | Monolith wins (today) | Microservices win (later) |
|-------|----------------------|---------------------------|
| Team size | Small team, full-stack ownership | Multiple teams with conflicting release cadences |
| Transactionality | Purchase + grant must be atomic | Requires sagas / outbox |
| Operational headcount | One container, one log stream | Service mesh, distributed tracing mandatory |
| Time to market | Ship features in one PR | Contract negotiation between services |

Investors should read this as **disciplined capital efficiency**, not inability to scale. Engineers should read this as **intentional coupling boundaries**, not a big ball of mud.

## Module map

```
AppModule
├── ConfigModule (global)
├── PrismaModule (global)
├── AuthModule
├── UsersModule
├── CreatorsModule
├── CoursesModule ──────┐
├── CourseModulesModule ├── catalog aggregate
├── LessonsModule ──────┘
├── AccessPlansModule ─── monetization config
├── BillingModule ─────── payments + webhooks (fulfillment core)
├── PurchasesModule
├── SubscriptionsModule
├── PaymentsModule
├── YoutubeModule
├── ReviewsModule / CommentsModule / FavoritesModule / NotificationsModule
└── HealthModule
```

**Common layer** (`apps/api/src/common/`):

- `access/` — `AccessService`, guards, decorators
- `database/` — Prisma wrapper
- `auth/` — JWT strategy, guards
- `config/` — typed configuration + validation
- `youtube/` — URL parsing utilities

## Boundary rules

### 1. Feature modules do not import each other's controllers

Cross-module calls go through **services** exported by modules, or through shared common services.

### 2. Billing owns money side effects

Only `BillingFulfillmentService` (and webhook handlers it calls) should create:

- `Payment`
- `UserPurchase` / `UserSubscription`
- `CourseAccess` grants from commercial events

Catalog modules must not grant paid access directly.

### 3. AccessService owns authorization truth

Guards and watch endpoints delegate to `AccessService`. Do not duplicate grant queries in controllers.

### 4. Database access via PrismaService

No raw SQL in feature code without ADR. All queries typed through `@smartklass/database` client.

### 5. Public API versioned

Breaking HTTP changes require `/api/v2` — internal module refactors do not.

## Dependency direction (allowed)

```
Controllers → Services → PrismaService
                ↓
         Other module Services (exported)
                ↓
         Common services (AccessService)
```

Avoid:

```
CoursesModule → BillingModule internals (non-exported providers)
LessonsModule → direct Stripe client usage
```

## NestJS patterns in use

| Pattern | Usage |
|---------|-------|
| `Module` exports | `BillingModule` exports `CheckoutService` for future promotion flows |
| Global guard | `JwtAuthGuard` — secure by default |
| Middleware | Request logging on all routes |
| `ValidationPipe` | Global DTO validation |
| Custom decorators | `@Public()`, `@RequireCourseAccess()`, `@CurrentUser()` |

## Physical deployment

One build artifact:

```bash
pnpm --filter @smartklass/api build
node dist/main.js
```

Horizontal scale = **multiple instances of the same monolith** behind a load balancer, shared MySQL, sticky sessions not required (JWT is stateless).

## Extraction candidates (future)

If we split, this is the order of consideration:

| Order | Module | Trigger |
|-------|--------|---------|
| 1 | `BillingModule` + webhooks | PCI scope isolation, independent deploy for payment hotfixes |
| 2 | Notification / email worker | Async throughput, retry queues |
| 3 | Search / discover | Elasticsearch specialization |

**Do not extract** catalog or access first — they are cohesion centers with too many synchronous callers.

## Extraction prerequisites

Before any split:

1. Outbox or event log for fulfillment side effects
2. Distributed tracing (correlation IDs already in middleware — extend)
3. Contract tests on HTTP boundaries
4. Idempotent webhook processing (already have `ProcessedStripeEvent`)

## Comparison to alternatives

| Architecture | Verdict for SmartKlass seed stage |
|--------------|-----------------------------------|
| Modular monolith | **Selected** |
| Microservices | Premature — ops cost > dev velocity |
| Serverless functions per route | Poor fit for Prisma connection pooling and webhook handling |
| Next.js API routes as backend | Rejected — splits business logic across runtimes |

## Related

- [ADR-001: Modular monolith](../adr/ADR-001-modular-monolith.md)
- [Overview](./overview.md)
- [Scaling plan](./scaling-plan.md)
