# Transactional outbox pattern

The outbox guarantees **at-least-once delivery** of side effects without coupling them to the HTTP request or Stripe webhook thread.

## Problem

Without outbox:

```
Stripe webhook → DB updated → email fails → inconsistent state
```

The payment is recorded but the learner never gets confirmation email. Retrying the webhook is unsafe without idempotency at every step.

## Solution

```
┌─────────────┐     same TX      ┌──────────────┐
│ Fulfillment │ ───────────────► │ outbox_events │
└─────────────┘                  └──────┬───────┘
                                        │ poll
                                        ▼
                                 ┌──────────────┐
                                 │   Worker     │
                                 └──────┬───────┘
                    ┌──────────────────┼──────────────────┐
                    ▼                  ▼                  ▼
                 Email            Notifications        Analytics
```

## Schema

`outbox_events`:

| Column | Purpose |
|--------|---------|
| `event_type` | e.g. `PaymentCompleted` |
| `aggregate_type` / `aggregate_id` | Entity reference |
| `payload` | JSON event body |
| `status` | PENDING → PROCESSING → COMPLETED / FAILED |
| `correlation_id` | Request trace |
| `retry_count` / `max_retries` | Exponential retry policy |

## Worker

`OutboxProcessorService` polls every 5s (configurable via `OUTBOX_POLL_MS`):

1. Claim row (`PENDING` → `PROCESSING`)
2. Publish to `DomainEventBusService`
3. Mark `COMPLETED` or requeue with `retry_count++`

Disable with `WORKER_ENABLED=false` (tests).

## Monitoring

- `GET /api/v1/health` — `checks.outboxPending`, `checks.outboxFailed`
- `GET /api/v1/health/ready` — fails if `outboxFailed >= 100`

## Related

- [Domain events](./domain-events.md)
- [Background jobs](./background-jobs.md)
- [Monitoring runbooks](./monitoring-runbooks.md)
