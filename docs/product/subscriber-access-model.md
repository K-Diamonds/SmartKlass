# Subscriber Access Model

## Definition

In SmartKlass, a **subscriber** is a user with an active **recurring entitlement** to a specific course's subscription plan. We use "subscriber" in the Stripe sense — a `UserSubscription` row tied to an `AccessPlan` where `planType = SUBSCRIPTION`.

This is distinct from:

- **One-time purchasers** (`UserPurchase` + `ONE_TIME` plan)
- **Free plan holders** (grant without payment — fulfillment path planned)
- **Preview viewers** (no grant; `isPreview` lesson flag)

There is no global "SmartKlass subscriber" in v1 schema. Subscriptions are **per course, per plan**.

## Entitlement ledger

The authoritative record of "may this user watch this course?" is `CourseAccess`:

```
CourseAccess
 ├── userId, courseId, accessPlanId
 ├── userPurchaseId?      → one-time fulfillment
 ├── userSubscriptionId? → recurring fulfillment
 ├── startsAt, expiresAt?
 └── revokedAt?           → manual or policy revocation
```

Every paid or granted path should create or update `CourseAccess`. Watch endpoints never trust the client — they call `AccessService`.

## Access resolution order

`AccessService.resolveCourseAccess()` applies the following logic:

1. **Course owner** — creator who owns the course via `CreatorProfile` → full access, no plan required
2. **Active grant** — valid `CourseAccess` row where:
   - `revokedAt` is null
   - `expiresAt` is null or in the future
   - Linked subscription (if any) is `ACTIVE` or `TRIALING` with `currentPeriodEnd > now`
   - Linked `AccessPlan` is active and not soft-deleted
3. **No grant** — no full course access; preview lessons may still be available per-lesson

## Access grant sources

The API exposes a resolved `source` for debugging, support, and UI badges:

| Source | Meaning |
|--------|---------|
| `CREATOR_OWNER` | Owns the course |
| `FREE_PLAN` | Active grant on free plan |
| `LIFETIME_PURCHASE` | One-time purchase completed |
| `SUBSCRIPTION_WEEKLY` | Active weekly subscription |
| `SUBSCRIPTION_MONTHLY` | Active monthly subscription |
| `SUBSCRIPTION_YEARLY` | Active yearly subscription |
| `PREVIEW` | Lesson-level preview only (not full course) |

## Lesson-level vs course-level access

| Check | Method | Rule |
|-------|--------|------|
| Full course watch | `canViewCourse` | Requires course-level grant or ownership |
| Module visibility | `canViewModule` | Same as course |
| Lesson watch | `canViewLesson` | Grant **or** (`isPreview` && published) |

**Watch API endpoints (gated):**

- `GET /courses/:id/watch` — full syllabus for entitled users
- `GET /lessons/:id/watch` — lesson payload including YouTube embed metadata

Non-entitled users receive `403 Forbidden` on course watch. Preview lessons are the deliberate exception.

## Subscription states

`UserSubscription.status` mirrors Stripe lifecycle:

| Status | Access behavior |
|--------|-----------------|
| `ACTIVE` | Grant valid through `currentPeriodEnd` |
| `TRIALING` | Treated as active in `AccessService` |
| `PAST_DUE` | Not active — grant skipped during resolution |
| `CANCELED` | Access until period end if Stripe still in paid period; otherwise lapsed |
| `EXPIRED` | No access |
| `PAUSED` | No access until resumed |

Webhook handlers (`StripeWebhookService`) update subscription rows; `BillingFulfillmentService` writes grants.

## One-time purchases

`UserPurchase` with `PurchaseStatus.COMPLETED` fulfills `CourseAccess`:

- **Lifetime plans:** `expiresAt = null`
- **Time-boxed one-time** (if `accessDurationDays` on plan): `expiresAt` computed at fulfillment

VIP and Lifetime are both `ONE_TIME` at the schema level — differentiation is **price and plan features**, not a separate enum.

## Free access

`AccessPlanType.FREE` plans exist for preview funnels and lead magnets. Checkout is bypassed (`CheckoutService` rejects free plans). Free fulfillment should write a `CourseAccess` row without a `Payment` — implementation should mirror paid fulfillment for consistent `AccessService` queries.

## What subscribers see (learner UX)

| Surface | Data source |
|---------|-------------|
| Library | Courses with active `CourseAccess` |
| Subscriptions | `UserSubscription` list with plan name and price |
| Learn player | Watch DTOs — modules, lessons, resources, YouTube embed |
| Locked lessons | Sidebar shows lock state; preview lessons playable |

Progress tracking is currently client-local (`localStorage`). Server-side progress is a planned enhancement and does not affect access.

## Revocation and edge cases

| Scenario | Expected behavior |
|----------|-------------------|
| Refund | Set `revokedAt` on grant; optional `PurchaseStatus.REFUNDED` |
| Chargeback | Same as refund — access revoked proactively |
| Plan deactivated | Existing grants honored until expiry; new checkouts blocked |
| Course archived | No new purchases; existing grants policy-defined (default: honor) |
| Creator deletes lesson | Soft delete; watch queries exclude `deletedAt != null` |

## Support and audit

For support tickets, query:

1. `CourseAccess` for user + course
2. Linked `UserSubscription` or `UserPurchase`
3. `Payment` and Stripe IDs in metadata
4. `ProcessedStripeEvent` for webhook replay debugging

The entitlement ledger is the **legal and commercial source of truth** for "did they pay?"

## Related documentation

- [User roles](./user-roles.md)
- [Subscription model](./subscription-model.md)
- [Architecture: access control](../architecture/access-control.md)
- [Architecture: payments](../architecture/payments.md)
