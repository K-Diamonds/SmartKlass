# Observability

## Current state

SmartKlass v1 ships with **foundational observability** suitable for development and early production. We log requests, expose health checks, and structure errors consistently. Full APM, distributed tracing, and metrics dashboards are planned as traffic grows.

This is intentional — observability investment scales with outage cost.

## What exists today

### Request logging

`RequestLoggingMiddleware` applies to all API routes:

- Incoming method + path
- Foundation for correlation ID injection (recommended next step)

### Health checks

`HealthModule` exposes service liveness for load balancers and uptime monitors.

### Error handling

`GlobalExceptionFilter` normalizes HTTP exceptions to consistent JSON — clients and log aggregators see predictable shapes.

### Webhook audit trail

`ProcessedStripeEvent` table provides **business-level trace** of Stripe event processing — invaluable for payment debugging even without APM.

## Logging standards (target)

| Field | Purpose |
|-------|---------|
| `timestamp` | ISO8601 |
| `level` | info / warn / error |
| `correlationId` | Per-request UUID (add to middleware) |
| `userId` | If authenticated — never log email in hot path |
| `route` | Normalized path template `/courses/:id/watch` |
| `durationMs` | Latency |
| `statusCode` | HTTP result |

### Do not log

- JWT tokens
- Stripe webhook raw bodies in production
- Passwords or reset tokens
- Full credit card metadata (we shouldn't receive it)

## Metrics (recommended for Stage 1)

| Metric | Type | Alert threshold (starter) |
|--------|------|---------------------------|
| `http_request_duration_p95` | Histogram | > 500ms for 5m |
| `http_requests_total{status=5xx}` | Counter | > 1% rate |
| `stripe_webhook_lag_seconds` | Gauge | > 30s |
| `checkout_sessions_created` | Counter | anomaly detection |
| `db_pool_waiting` | Gauge | > 10 sustained |

Implement via OpenTelemetry exporter or hosted APM (Datadog, Honeycomb, Grafana Cloud).

## Tracing

Priority spans:

1. `CheckoutService.createCoursePlanCheckout`
2. `StripeWebhookService.handleEvent`
3. `BillingFulfillmentService.fulfill`
4. `AccessService.canViewLesson`

Trace ID should propagate from middleware → Prisma queries (comment annotation) → Stripe SDK calls.

## Dashboards

### Engineering dashboard

- API error rate by route
- p50/p95 latency by route group (auth, watch, billing, catalog)
- DB connection pool utilization

### Business dashboard

- Checkout sessions created vs completed (funnel)
- Webhook failures
- Active grants count (daily snapshot query)

Creator Studio metrics are product analytics — separate from ops dashboards.

## Alerting philosophy

| Severity | Example | Response |
|----------|---------|----------|
| P1 | API down, DB unreachable | Page on-call |
| P2 | Webhook failure rate > 5% | Slack alert, fix within hours |
| P3 | Elevated p95 latency | Next business day |

Early stage: **alert on symptoms users feel**, not every log line.

## Local development

```bash
pnpm --filter @smartklass/api start:dev
# Logs to stdout — structured JSON recommended in prod
```

Stripe CLI for webhook forwarding:

```bash
stripe listen --forward-to localhost:4000/api/v1/stripe/webhook
```

## CI signals

| Check | Command |
|-------|---------|
| Unit tests | `pnpm --filter @smartklass/api test` |
| Lint | `pnpm --filter @smartklass/api lint` |
| Typecheck | `pnpm --filter @smartklass/api typecheck` |
| Web build | `pnpm --filter @smartklass/web build` |

Add test coverage gate on `AccessService` and billing modules before scaling traffic.

## On-call runbooks (starter)

### "User paid but no access"

1. Stripe Dashboard → payment status
2. `processed_stripe_events` for event ID
3. `user_purchases` / `user_subscriptions` for user
4. `course_access` grant row
5. Manual grant + root cause if webhook missed

### "Watch returns 403 for subscriber"

1. `user_subscriptions.status` and `current_period_end`
2. Linked `course_access.revoked_at`
3. `access_plans.is_active`

## Roadmap

| Phase | Deliverable |
|-------|-------------|
| v1.1 | Correlation IDs in middleware + structured JSON logs |
| v1.2 | OpenTelemetry + hosted APM |
| v1.3 | SLO definitions (99.5% API availability) |
| v2 | Real-time creator revenue stream (analytics pipeline) |

## Related

- [Scaling plan](./scaling-plan.md)
- [Security](./security.md)
- [Payments](./payments.md)
