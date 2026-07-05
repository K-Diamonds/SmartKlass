# ADR-004: Single User, Multi-Capability Model

## Status

**Accepted** — 2026

## Context

Learning platforms often model **roles**: Student, Instructor, Admin. This appears simple in RBAC diagrams but fails in production:

- A creator buys a competitor's course — are they a student or instructor?
- Access expires mid-session — role does not change, entitlement does
- Preview lessons break role checks — special cases multiply
- Support asks "did they pay?" — roles answer the wrong question

SmartKlass needed an identity model that matches how money and content actually work.

## Decision

**One `User` account with optional profiles. No `STUDENT` role. Authorization for content uses `AccessService` and the `CourseAccess` entitlement ledger.**

| Concept | Implementation |
|---------|----------------|
| Identity | `User` + `UserProfile` |
| Creator capability | Optional `CreatorProfile` |
| Learner capability | Active `CourseAccess` grant (or preview lesson flag) |
| Course ownership | `CreatorProfile` linked to `Course` |

JWT proves identity. Entitlements prove access.

## Consequences

### Positive

- **Support clarity** — "show me their `course_access` row" ends disputes
- **Simpler guards** — `CourseOwnerGuard` + `RequireLessonAccessGuard` cover most cases
- **Creator UX** — same login for Studio and Learn
- **Investor narrative** — auditable entitlement ledger for revenue recognition

### Negative

- Marketing copy must avoid "student account" language
- Admin/moderation roles not in schema yet — need separate ADR when built
- Some queries join more tables than a naive `role_id` column

### API contract

`AccessGrantSource` enum documents why access was granted — essential for UI badges and debugging.

## Alternatives considered

| Alternative | Rejected because |
|-------------|------------------|
| `STUDENT` / `CREATOR` enum on `User` | Cannot represent dual capability; wrong lifecycle |
| Separate auth realms for studio vs learn | Password reset friction; session confusion |
| JWT claims with `purchasedCourseIds` | Stale on refund; large token payload |

## Rules for new features

Before adding a role check, answer:

1. Is this about **who they are** (identity) or **what they bought** (entitlement)?
2. If entitlement — extend `AccessService` or fulfillment, not `User.role`

## References

- [User roles](../product/user-roles.md)
- [Subscriber access model](../product/subscriber-access-model.md)
- [Access control](../architecture/access-control.md)
