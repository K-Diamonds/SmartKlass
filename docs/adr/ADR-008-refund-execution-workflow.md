# ADR-008: Refund execution workflow

**Status:** Accepted  
**Date:** 2026-07-05  
**Deciders:** Engineering  
**Supersedes:** None (extends refund handling in [ADR-005](./ADR-005-stripe-connect-marketplace-payments.md))

## Context

Previously, staff could mark a webhook-synced `Refund` as "approved" in one step. That conflated:

- Operational intent (should we refund?)
- Stripe execution (money movement)
- Ledger sync (webhook-driven `Refund` row)

Finance and risk need separate approval and execution with a full audit trail.

## Decision

Introduce `RefundRequest` as a workflow entity distinct from ledger `Refund`:

| Step | Action | Stripe call |
|------|--------|-------------|
| 1 | `requestRefund` — reason required | No |
| 2 | `approve` — reason required | No |
| 3 | `execute` — reason required | Yes (`refunds.create`) |
| — | `deny` — reason + denialReason | No |

States: `REQUESTED` → `APPROVED` → `EXECUTING` → `EXECUTED` (or `DENIED` / `FAILED`).

Execution is rejected unless status is `APPROVED`. Error message explicitly states approval and execution are separate.

## Audit

All transitions log to `AdminAuditLog` with `targetType = REFUND_REQUEST`. Dedicated `GET .../audit` endpoint for support.

## Legacy

`POST /admin/refunds/:refundId/approve` retained for marking webhook refunds as reviewed; new refunds must use `RefundRequest`.

## Consequences

**Positive**

- SOX-friendly separation: approver ≠ executor
- Failed Stripe calls leave request in `FAILED` with `executionError`
- Webhook sync still source of truth for ledger balances

**Negative**

- Two-step UX for finance ops
- Duplicate concepts (`Refund` vs `RefundRequest`) until legacy path is removed

## Related

- [refund-workflow.md](../architecture/refund-workflow.md)
