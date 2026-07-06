# Refund execution workflow

Refunds use a **four-step workflow** separate from the Stripe ledger `Refund` table synced by webhooks.

## States

```
REQUESTED → APPROVED → EXECUTING → EXECUTED
    │           │
    └→ DENIED   └→ DENIED (before execution)
    
EXECUTING → FAILED (Stripe error; may be retried manually)
```

| Status | Meaning |
|--------|---------|
| `REQUESTED` | Staff opened a refund case; no Stripe call yet |
| `APPROVED` | Finance/risk approved; still no Stripe call |
| `EXECUTING` | Stripe `refunds.create` in flight |
| `EXECUTED` | Stripe refund succeeded; linked to ledger `Refund` |
| `DENIED` | Rejected with required `denialReason` |
| `FAILED` | Stripe API error; `executionError` stored |

**Approval and execution are intentionally separate.** Approving records intent and audit only; executing calls Stripe.

## API

| Method | Path | Permission |
|--------|------|------------|
| `POST` | `/admin/refund-requests` | `admin:refunds:request` |
| `POST` | `/admin/refund-requests/:id/approve` | `admin:refunds:approve` |
| `POST` | `/admin/refund-requests/:id/deny` | `admin:refunds:deny` |
| `POST` | `/admin/refund-requests/:id/execute` | `admin:refunds:execute` |
| `GET` | `/admin/refund-requests/:id/audit` | `admin:refunds:read` |

All mutating endpoints require a `reason` string. Deny also requires `denialReason`.

## Audit trail

Every transition writes to `AdminAuditLog` with `targetType = REFUND_REQUEST`. Use `GET /admin/refund-requests/:id/audit` for the full history.

## Ledger sync

On successful execution:

1. Stripe `refunds.create` runs with `metadata.refundRequestId`
2. `MarketplaceAccountingService.syncRefundFromStripe` upserts the `Refund` row
3. `RefundRequest.refundId` links workflow → ledger

## Legacy endpoint

`POST /admin/refunds/:refundId/approve` remains for marking webhook-synced refunds as manually reviewed. New operational refunds should use `RefundRequest`.

## Related

- [ADR-008](../adr/ADR-008-refund-execution-workflow.md)
- [Payments](./payments.md)
