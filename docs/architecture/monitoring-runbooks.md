# Monitoring, alerting & runbooks

## Endpoints

| Endpoint | Purpose | K8s probe |
|----------|---------|-----------|
| `GET /api/v1/health` | Full health + outbox counts | — |
| `GET /api/v1/health/live` | Process alive | `livenessProbe` |
| `GET /api/v1/health/ready` | DB + outbox failed < 100 | `readinessProbe` |
| `GET /api/v1/health/metrics` | In-process counters/histograms | Scraping (dev) |

## Structured logs

Every HTTP request logs JSON:

```json
{
  "level": "info",
  "message": "http_request",
  "method": "POST",
  "path": "/api/v1/stripe/webhook",
  "statusCode": 200,
  "durationMs": 142,
  "correlationId": "uuid",
  "requestId": "uuid"
}
```

Pass `X-Correlation-Id` from clients for distributed traces.

## Alert thresholds (starter)

| Signal | Warning | Critical |
|--------|---------|----------|
| `health.checks.database` | — | `down` |
| `health.checks.outboxFailed` | > 10 | > 100 |
| `health.checks.outboxPending` | > 500 for 15m | > 5000 |
| HTTP 5xx rate | > 1% / 5m | > 5% / 5m |
| p95 latency | > 500ms | > 2s |

## Runbook: Outbox failures

1. `SELECT * FROM outbox_events WHERE status = 'FAILED' ORDER BY created_at DESC LIMIT 20`
2. Read `last_error` — fix code or data issue
3. After fix: `UPDATE outbox_events SET status = 'PENDING', retry_count = 0 WHERE id = ?`
4. Confirm `outboxFailed` drops in `/health`

## Runbook: User paid, no access

1. Stripe Dashboard → payment succeeded?
2. `processed_stripe_events` for `checkout.session.completed`
3. `outbox_events` for `PaymentCompleted` / `CourseAccessGranted`
4. `course_access` row for user + course
5. Replay webhook or manual grant + root cause

## Runbook: Admin 429

1. Check `ADMIN_RATE_LIMIT_*` env
2. Set `REDIS_URL` for shared limits across instances
3. Verify staff user not in abusive loop

## Runbook: Daily jobs stuck

1. `SELECT * FROM job_runs WHERE status = 'FAILED' ORDER BY created_at DESC`
2. Fix underlying issue (e.g. DB lock)
3. Re-run via future admin endpoint or restart API after fix

## Incident response

| Severity | Examples | Response |
|----------|----------|----------|
| SEV1 | API down, payments broken | Page on-call, status comms |
| SEV2 | Webhook failures > 5% | Fix within 4h |
| SEV3 | Elevated latency | Next business day |

## Related

- [Observability](./observability.md)
- [Disaster recovery](./disaster-recovery.md)
- [Outbox pattern](./outbox-pattern.md)
