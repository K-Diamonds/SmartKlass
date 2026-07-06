# CQRS-lite (admin read models)

Full CQRS is not warranted at current scale. SmartKlass uses **CQRS-lite**: separate query handlers for heavy admin reads, while commands remain in existing services.

## Commands (writes)

Unchanged — stay in domain services:

- `BillingFulfillmentService` — grants, ledger
- `CreatorRiskService` — trust tiers
- `RefundWorkflowService` — refund approval/execution

## Queries (reads)

Dedicated query classes in `apps/api/src/modules/admin-queries/`:

| Query | Endpoint | Purpose |
|-------|----------|---------|
| `PlatformRevenueQuery` | `GET /admin/queries/platform-revenue` | GMV, fees, payouts |
| `CreatorRevenueQuery` | `GET /admin/queries/creators/:id/revenue` | Per-creator breakdown |
| `RiskDashboardQuery` | `GET /admin/queries/risk-dashboard` | Flagged creators, events |
| `TransactionTimelineQuery` | `GET /admin/queries/transaction-timeline` | Drill-down timeline |

## Why separate queries?

- Admin reports can add joins, aggregations, and caching without bloating command services
- Read models can later move to read replicas or materialized views
- Clear RBAC boundary (`METRICS_READ`, `TRANSACTIONS_READ`)

## Future

When report latency matters:

1. Materialized views refreshed by outbox consumers
2. Read replica routing for `/admin/queries/*`
3. Optional Redis cache with TTL per query type

## Related

- [Admin operations](./admin-operations.md)
