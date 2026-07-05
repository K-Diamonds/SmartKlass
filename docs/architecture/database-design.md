# Database Design

## Design goals

The SmartKlass schema optimizes for:

1. **Commercial truth** — who paid, for which plan, until when
2. **Curriculum structure** — ordered modules and lessons with soft deletes
3. **Creator ownership** — explicit `CreatorProfile` → `Course` relationship
4. **Auditability** — timestamps, status enums, Stripe ID mirrors
5. **Evolvability** — enums and JSON metadata for extension without migrations every week

ORM: **Prisma**. Database: **MySQL 8.4**. Package: `packages/database`.

## Entity relationship (simplified)

```
User ──┬── UserProfile
       ├── CreatorProfile ── Course ──┬── CourseModule ── Lesson ── LessonResource
       │                              ├── AccessPlan ── PlanFeature
       │                              ├── Review / Comment / Favorite
       ├── UserPurchase ── Payment
       ├── UserSubscription
       └── CourseAccess (entitlement ledger)
```

`CourseAccess` is the hinge table between users and commercial relationships.

## Core tables

### Identity

| Table | Notes |
|-------|-------|
| `users` | Auth root; `email` unique; `password_hash`; `status` enum |
| `user_profiles` | Learner-facing profile, 1:1 |
| `creator_profiles` | `slug` unique; optional per user; owns courses |

### Catalog

| Table | Notes |
|-------|-------|
| `courses` | `status`: DRAFT → PENDING_REVIEW → PUBLISHED → ARCHIVED |
| `course_modules` | `sort_order` for curriculum ordering |
| `lessons` | YouTube fields, `is_preview`, `status` |
| `lesson_resources` | Typed attachments (PDF, LINK, etc.) |
| `categories` | Hierarchical taxonomy via `parent_id` |

### Monetization

| Table | Notes |
|-------|-------|
| `access_plans` | Per-course; `plan_type`, `billing_interval`, `stripe_price_id` |
| `plan_features` | Marketing/feature bullets per plan |
| `payments` | Stripe PaymentIntent mirror |
| `user_purchases` | One-time fulfillment source |
| `user_subscriptions` | Recurring fulfillment source |
| `course_access` | **Grant ledger** — links user to course + plan |
| `processed_stripe_events` | Webhook idempotency keys |

### Engagement

| Table | Notes |
|-------|-------|
| `reviews` | Unique per user+course; `is_published` for moderation |
| `comments` | Threaded via `parent_comment_id`; course or lesson scoped |
| `favorites` | Wishlist |
| `notifications` | In-app notification feed |

## Key enums

| Enum | Values | Purpose |
|------|--------|---------|
| `CourseStatus` | DRAFT, PENDING_REVIEW, PUBLISHED, ARCHIVED | Publication lifecycle |
| `LessonStatus` | DRAFT, PUBLISHED, ARCHIVED | Lesson visibility |
| `AccessPlanType` | FREE, ONE_TIME, SUBSCRIPTION | Billing shape |
| `BillingInterval` | WEEKLY, MONTHLY, YEARLY | Subscription period |
| `SubscriptionStatus` | ACTIVE, TRIALING, PAST_DUE, CANCELED, EXPIRED, PAUSED | Stripe sync |
| `PurchaseStatus` | PENDING, COMPLETED, FAILED, REFUNDED, CANCELED | One-time sync |

## Entitlement modeling

`course_access` columns and meaning:

| Column | Role |
|--------|------|
| `user_id`, `course_id`, `access_plan_id` | Who has what plan on which course |
| `user_purchase_id` | Nullable FK — one-time path |
| `user_subscription_id` | Nullable FK — recurring path |
| `starts_at` | Grant effective time |
| `expires_at` | Null = lifetime |
| `revoked_at` | Support/refund/chargeback |

**Invariant:** Active access queries filter `revoked_at IS NULL` and (`expires_at IS NULL OR expires_at > NOW()`).

## Indexing strategy

Indexes match query patterns in `AccessService` and catalog listing:

- `course_access (user_id, course_id)` — grant lookup
- `user_subscriptions (user_id, status)` — subscription resolution
- `lessons (module_id, sort_order)` — syllabus ordering
- `courses (status, published_at)` — discover feeds
- `access_plans (course_id, is_active)` — checkout validation

Review query plans when discover page exceeds ~50ms p95.

## Soft deletes

Pattern: `deleted_at` nullable timestamp on user-generated content.

| Behavior | Rationale |
|----------|-----------|
| Soft delete lessons/modules | Creators can restore; purchases still reference course |
| Soft delete users | GDPR workflow can hard-delete later with cascade policy |
| Restrict delete on `access_plan` if purchases exist | Financial integrity (`onDelete: Restrict`) |

## Stripe mirrors

We store external IDs for reconciliation and support:

| Column | Stripe object |
|--------|---------------|
| `access_plans.stripe_price_id` | Price |
| `payments.stripe_payment_intent_id` | PaymentIntent |
| `user_subscriptions.stripe_subscription_id` | Subscription |
| `processed_stripe_events.id` | Event ID |

Stripe is authoritative for payment state; we **reconcile** via webhooks.

## Migration workflow

```bash
# Edit schema.prisma
pnpm --filter @smartklass/database prisma migrate dev --name descriptive_name
```

Rules:

- Migrations are forward-only in production
- No manual prod edits without a migration file
- Seed data lives separately from migrations

## Data integrity choices

| Decision | Trade-off |
|----------|-----------|
| `cuid()` IDs | URL-safe, no coordination; larger than UUID |
| `uuid()` for `Course.id` | Standard IDs for creator-created courses |
| `Decimal` for `estimated_hours` | Precision for display |
| `Json` on `payments.metadata` | Flexibility vs queryability |
| No separate `students` table | Simpler joins; entitlement queries slightly richer |

## Future schema extensions

| Feature | Likely approach |
|---------|-----------------|
| Server-side progress | `lesson_progress (user_id, lesson_id, completed_at, position_seconds)` |
| Platform subscription | `platform_plans` or bundle join table |
| Creator payouts | `creator_payouts` + Stripe Connect account ID on `creator_profiles` |
| Coupons | `promotion_codes` linked to `access_plans` |

## Related

- [ADR-002: MySQL + Prisma](../adr/ADR-002-mysql-prisma.md)
- [Access control](./access-control.md)
- [Payments](./payments.md)
