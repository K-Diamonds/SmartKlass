# Scaling Plan

## Current baseline

| Dimension | v1 posture |
|-----------|------------|
| Architecture | Single NestJS modular monolith |
| Database | Single MySQL primary |
| Web | Next.js static + SSR hybrid |
| Video | YouTube CDN (zero platform egress for video) |
| Auth | Stateless JWT |
| Background work | Synchronous webhook fulfillment |

This comfortably supports **thousands of concurrent learners** and **hundreds of creators** on modest infrastructure if queries stay indexed.

## Scaling stages

### Stage 0 — Seed / MVP (now)

**Goal:** Ship product-market fit, not infinite scale.

| Layer | Setup |
|-------|-------|
| API | 1–2 containers, 1 vCPU each |
| DB | Managed MySQL small tier (or Docker locally) |
| Web | Vercel hobby/pro or single container |
| Stripe | Test → live mode toggle |

**Bottleneck watchlist:** webhook throughput during launch promotions, discover page N+1 queries.

### Stage 1 — Growth (10k–100k registered users)

**Goal:** Reduce p95 latency and operational risk without microservices.

| Initiative | Effort | Impact |
|------------|--------|--------|
| Read replica for catalog queries | Low | Offload discover/browse from primary |
| Redis cache for public course cards | Medium | Cut DB reads 80% on hot paths |
| Connection pooling (PgBouncer-style proxy or RDS proxy) | Low | Stabilize Prisma under concurrency |
| Horizontal API replicas (3–6) | Low | Linear request capacity |
| CDN for thumbnails and static assets | Low | Faster global TTFB |

**Keep monolith.** Add replicas, not services.

### Stage 2 — Monetization scale (high GMV)

**Goal:** Financial correctness under burst traffic (sales events, influencer drops).

| Initiative | Effort | Impact |
|------------|--------|--------|
| Webhook queue (SQS/BullMQ) async fulfillment | Medium | Absorb Stripe retry storms |
| Outbox pattern for grant writes | Medium | Exactly-once semantics |
| Dedicated billing worker process | Medium | Isolate payment hot path |
| Rate limiting on checkout endpoint | Low | Abuse prevention |

Consider **extracting BillingModule** to separate deployable only if payment hotfixes outpace catalog release cadence.

### Stage 3 — Catalog scale (100k+ courses, heavy discover)

**Goal:** Search and recommendation quality.

| Initiative | Effort | Impact |
|------------|--------|--------|
| Elasticsearch/OpenSearch for full-text discover | High | Sub-100ms search |
| Materialized view for course ratings / student counts | Medium | Fast sort/filter |
| Category tree caching | Low | Browse performance |

### Stage 4 — Platform subscription + social

**Goal:** Cross-course entitlements and engagement features.

| Initiative | Effort | Impact |
|------------|--------|--------|
| Batch grant job for platform plans | Medium | New revenue line |
| Notification worker + email provider | Medium | Retention |
| Server-side progress aggregation | Medium | Completion certificates |

## What scales "for free"

| Workload | Why |
|----------|-----|
| Video playback | YouTube bears bandwidth |
| Static marketing pages | CDN edge cache |
| JWT validation | CPU-only per request |

## What does not scale without work

| Workload | Risk |
|----------|------|
| `AccessService` grant queries per lesson navigation | DB read amplification |
| Synchronous webhook handling | Stripe retry backlog |
| Full table scan discover | Slow as catalog grows |
| Creator Studio bulk reorder | Large transactions |

## Database scaling path

```
Single primary
    → Read replica (catalog)
    → Primary + replica + connection pooler
    → Shard by creator_id (only if extreme — unlikely before Series B)
```

Prisma supports read replicas via extension or separate client — plan before custom sharding.

## Observability triggers for next stage

Scale the **team/process** when:

- API p95 > 500ms on watch endpoints for 7 days
- MySQL CPU > 70% sustained
- Webhook processing lag > 30 seconds
- Error rate on checkout > 1%

See [observability.md](./observability.md).

## Cost model discipline

YouTube embed strategy keeps COGS flat as MAU grows. Marginal cost is **MySQL + API compute + Stripe fees** — attractive unit economics if take rate is healthy.

Self-hosted video would move us to Stage 1 infra costs at Stage 0 revenue — avoid until ARR justifies it.

## Related

- [Modular monolith](./modular-monolith.md)
- [ADR-001](../adr/ADR-001-modular-monolith.md)
- [ADR-003](../adr/ADR-003-youtube-links-no-video-hosting.md)
