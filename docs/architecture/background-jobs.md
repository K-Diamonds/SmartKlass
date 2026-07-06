# Background jobs

In-process workers run inside the API process today. A dedicated `apps/worker` deployable is the Stage 2 extraction path.

## Configuration

| Env | Default | Purpose |
|-----|---------|---------|
| `WORKER_ENABLED` | `true` | Master switch |
| `OUTBOX_POLL_MS` | `5000` | Outbox processor interval |
| `DAILY_JOB_POLL_MS` | `60000` | Daily job scheduler tick |
| `DAILY_JOB_HOUR_UTC` | `6` | Earliest UTC hour for daily batch |

## Daily jobs

| Job | Schedule | Action |
|-----|----------|--------|
| `expire_subscriptions` | Daily | Mark past-due subs as EXPIRED |
| `promote_matured_transactions` | Daily | PENDING → AVAILABLE after hold |
| `generate_analytics_snapshot` | Daily | Platform counters snapshot |
| `cleanup_stale_job_runs` | Daily | Delete completed runs > 30d |

Job history: `job_runs` table.

## Outbox processor

Runs continuously (not daily) — see [outbox-pattern.md](./outbox-pattern.md).

## Future workers

| Worker | Trigger |
|--------|---------|
| Creator payouts | Daily + manual |
| Recommendation refresh | Daily |
| Scheduled course publish | Cron on `course_versions.scheduled_for` |
| Email delivery | Outbox `EmailQueued` consumer |

## Related

- [Scaling plan](./scaling-plan.md)
- [Outbox pattern](./outbox-pattern.md)
