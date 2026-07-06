# Outbox backlog runbook

## Symptoms

- `health.checks.outboxPending` > 500 for 15+ minutes
- `outbox_failures_total` or `outbox_batch_failures_total` increasing
- Users not receiving emails or in-app notifications after purchase
- `DEAD_LETTER` rows appearing in `outbox_events`

## Immediate triage

1. Confirm workers are running: `WORKER_ENABLED=true` on API instances.
2. Check `/api/v1/health/ready` — fails when `outboxFailed` >= 100.
3. Inspect backlog shape:

```sql
SELECT status, event_type, COUNT(*) AS cnt
FROM outbox_events
GROUP BY status, event_type
ORDER BY cnt DESC;
```

4. Read `last_error` on oldest stuck rows:

```sql
SELECT id, event_type, retry_count, last_error, created_at
FROM outbox_events
WHERE status IN ('PENDING', 'FAILED', 'DEAD_LETTER')
ORDER BY created_at ASC
LIMIT 25;
```

## Recovery

### Worker disabled

1. Enable workers and redeploy.
2. Backlog should drain at `OUTBOX_POLL_MS` (default 5s) × batch size 25.

### Handler bug (code fix required)

1. Deploy fix.
2. Replay safe rows:

```sql
UPDATE outbox_events
SET status = 'PENDING', retry_count = 0, last_error = NULL
WHERE status = 'FAILED'
  AND event_type = '<fixed-event-type>'
  AND created_at > NOW() - INTERVAL 7 DAY;
```

### Dead letter

1. Do **not** bulk-replay without understanding root cause.
2. For idempotent handlers, receipts in `outbox_handler_receipts` prevent duplicate side effects.
3. Manually process or delete only after verifying downstream effect (email sent, notification exists).

### Database pressure

1. Scale API worker instances (same modular monolith, more replicas).
2. Temporarily lower poll interval only if DB CPU allows.

## Metrics to watch

- `outbox_events_processed_total`
- `outbox_failures_total{deadLetter="true"}`
- `outbox_batch_duration_ms` p95

## Escalation

- Critical: backlog > 5000 or purchase fulfillment blocked > 30 minutes
