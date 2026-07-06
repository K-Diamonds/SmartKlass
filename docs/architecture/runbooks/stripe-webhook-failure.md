# Stripe webhook failure runbook

## Symptoms

- `stripe_webhook_failures_total` increasing in Prometheus
- Payments stuck in `PENDING` while Stripe shows succeeded
- `processed_stripe_events` missing recent event IDs
- Creators report missing access after checkout

## Immediate triage

1. Check API logs for `stripe.webhook` spans and signature errors.
2. Confirm `STRIPE_WEBHOOK_SECRET` matches the active endpoint in Stripe Dashboard.
3. Verify the API receives raw body (no JSON body parser on webhook route).
4. Query dead-letter outbox events related to `PaymentCompleted`.

```sql
SELECT id, event_type, status, retry_count, last_error, created_at
FROM outbox_events
WHERE status IN ('FAILED', 'DEAD_LETTER')
ORDER BY created_at DESC
LIMIT 50;
```

## Recovery

### Signature failures

1. Rotate webhook secret in Stripe and update env.
2. Restart API workers (`WORKER_ENABLED=true`).
3. Replay missed events from Stripe Dashboard → Webhooks → Resend.

### Processing failures after signature

1. Fix root cause (DB constraint, fulfillment bug).
2. Reset failed outbox rows to `PENDING` only after code fix is deployed:

```sql
UPDATE outbox_events
SET status = 'PENDING', retry_count = 0, last_error = NULL
WHERE id = '<event-id>' AND status IN ('FAILED', 'DEAD_LETTER');
```

3. Use admin webhook replay tooling when available for bounded replays.

## Prevention

- Alert on `stripe_webhook_failures_total` > 0 for 5 minutes.
- Monitor `outboxPending` via `/api/v1/health`.
- Keep webhook idempotency table (`processed_stripe_events`) backed up.

## Escalation

- Finance: payment state mismatch > 15 minutes
- Engineering: repeated dead-letter on same event type
