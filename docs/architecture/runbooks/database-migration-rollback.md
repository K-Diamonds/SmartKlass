# Database migration rollback runbook

## When to use

- Migration caused production errors (constraint violation, downtime)
- Deploy must be reverted before forward fix is ready
- **Not** for routine schema changes — prefer forward-fix migrations

## Before migrating (always)

1. Take DB snapshot / backup (RDS snapshot, mysqldump, etc.).
2. Run migration on staging with production-like data volume.
3. Record migration name: `packages/database/prisma/migrations/<timestamp>_<name>/`.
4. Plan rollback window with maintenance notice if destructive.

## Detect failure

- API readiness fails (`/api/v1/health/ready`)
- Prisma errors on startup: unknown column, failed constraint
- Elevated 5xx after deploy correlating with migration time

## Rollback options

### Option A — Forward fix (preferred)

1. Ship a new migration that reverses the change safely.
2. Deploy API version compatible with both states during transition if needed.

### Option B — Restore snapshot

1. Stop traffic to API (scale to 0 or enable maintenance mode).
2. Restore database from pre-migration snapshot.
3. Deploy previous application image (git tag / container digest).
4. Verify health checks and smoke tests.
5. Re-enable traffic.

### Option C — Manual SQL rollback (last resort)

Only when migration SQL is reversible and team has reviewed `migration.sql`:

```bash
# Example: document inverse SQL in ticket — never run unreviewed scripts
mysql -h $DB_HOST -u $DB_USER -p$DB_PASS $DB_NAME < rollback-<migration>.sql
```

Then mark Prisma migration history consistent:

```sql
DELETE FROM _prisma_migrations WHERE migration_name = '<migration_folder_name>';
```

## Prisma-specific notes

- `prisma migrate deploy` applies pending migrations in order.
- Do not delete migration files from git after production apply.
- After restore, run `npx prisma migrate status` before next deploy.

## Verification checklist

- [ ] `/api/v1/health` → database `ok`
- [ ] Critical flows: login, checkout webhook, course watch
- [ ] Outbox pending not spiking
- [ ] No new migration drift on CI

## Post-incident

- Write postmortem with root cause
- Add staging test for the failed migration pattern
- Update ADR if schema process needs change
