# Disaster recovery plan

**RTO target:** 4 hours (API + DB restore)  
**RPO target:** 1 hour (point-in-time recovery)

## Critical dependencies

| System | Provider | Backup |
|--------|----------|--------|
| MySQL | Hostinger / managed | Daily automated + binlog PITR |
| Stripe | Stripe | Dashboard + API reconciliation |
| Secrets | `.env` / vault | Encrypted offsite copy |
| Code | GitHub | Main branch always deployable |

## Failure scenarios

### Database loss

1. Stop API traffic (maintenance page)
2. Restore latest snapshot to new instance
3. Apply binlogs to RPO window
4. Update `DATABASE_URL`, run `prisma migrate deploy`
5. Verify health + reconciliation report
6. Resume traffic

### Stripe webhook gap

1. List `processed_stripe_events` for time window
2. Stripe Dashboard → Events → compare
3. Admin replay missing events via `/admin/webhooks/stripe/:id/replay`
4. Run reconciliation for affected period

### Region / host outage

1. Deploy API to secondary host (same DB if reachable)
2. Update DNS / `NEXT_PUBLIC_API_URL`
3. If DB unreachable — execute DB restore procedure

### Outbox backlog

1. Check `GET /health` → `outboxFailed`
2. Query `outbox_events WHERE status = FAILED`
3. Fix handler bug, reset status to PENDING for retry
4. Scale worker poll rate temporarily

## Backup verification

| Frequency | Action |
|-----------|--------|
| Monthly | Restore DB snapshot to staging |
| Quarterly | Full DR tabletop exercise |
| After schema migration | Staging deploy + smoke test |

## Contacts (template)

| Role | Responsibility |
|------|----------------|
| On-call engineer | Incident commander |
| DB admin | Restore + migration |
| Finance ops | Stripe reconciliation sign-off |

## Related

- [Monitoring runbooks](./monitoring-runbooks.md)
- [Reconciliation v2](./stripe-reconciliation-v2.md)
