# ADR-009: Domain events and transactional outbox

**Status:** Accepted  
**Date:** 2026-07-06  
**Deciders:** Engineering

## Context

Billing fulfillment ran side effects (notifications, analytics, email) synchronously inside webhook handlers. A failure in any downstream step could leave the system inconsistent with no reliable retry.

## Decision

1. **Domain event catalog** — typed events (`PaymentCompleted`, `CourseAccessGranted`, etc.) in `common/domain-events`
2. **Transactional outbox** — `outbox_events` table; events written in same Prisma transaction as business state
3. **In-process bus** — `DomainEventBusService` with registered handlers; no external message broker
4. **Outbox worker** — `OutboxProcessorService` polls and publishes with retry

## Consequences

**Positive**

- At-least-once side effect delivery
- Webhook thread can return fast (future: webhook writes outbox only)
- Clear path to extract notification/email services

**Negative**

- Additional table and worker complexity
- Handlers must be idempotent
- Slight latency for async side effects (seconds)

## Alternatives considered

| Alternative | Why not |
|-------------|---------|
| Kafka / RabbitMQ | Ops overhead at current scale |
| Fire-and-forget `setImmediate` | No durability on crash |
| Sync only | Email/analytics failures block payments |

## Related

- [domain-events.md](../architecture/domain-events.md)
- [outbox-pattern.md](../architecture/outbox-pattern.md)
