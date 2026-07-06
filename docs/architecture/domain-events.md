# Domain events (modular monolith)

SmartKlass uses an **in-process domain event bus** — not Kafka, not RabbitMQ. Events live inside the NestJS modular monolith and prepare the codebase for future service extraction.

## Event flow

```
PaymentCompleted
  → CourseAccessGranted
  → CreatorTransactionCreated
  → AnalyticsUpdated
  → NotificationSent
  → EmailQueued
```

Primary events are written to the **transactional outbox** in the same database transaction as business state. The outbox worker publishes to `DomainEventBusService`, which invokes registered handlers.

## Event catalog

| Event | Producer | Consumers |
|-------|----------|-----------|
| `PaymentCompleted` | Billing fulfillment | Audit, analytics |
| `CourseAccessGranted` | Billing fulfillment | Email queue, notifications |
| `CreatorTransactionCreated` | Billing fulfillment | Analytics rollup |
| `SubscriptionRenewed` | Billing fulfillment | Notifications |
| `AnalyticsUpdated` | Outbox handlers | Future analytics pipeline |
| `EmailQueued` | Outbox handlers | Future email worker |

Constants: `apps/api/src/common/domain-events/domain-event.types.ts`

## Design rules

1. **Write events in the same transaction** as state changes (via `OutboxService.append`).
2. **Handlers must be idempotent** — outbox retries on failure.
3. **No cross-module direct calls** for side effects that can be async (email, analytics).
4. **Correlation IDs** propagate from HTTP middleware through outbox payloads.

## Future extraction

When splitting services, the outbox table becomes the integration boundary:

- Billing service writes `outbox_events`
- Notification service polls or receives from a queue fed by outbox relay
- Event schema versioning in `payload` JSON

## Related

- [Outbox pattern](./outbox-pattern.md)
- [ADR-009](../adr/ADR-009-domain-events-outbox.md)
