# @smartklass/database

Prisma schema, migrations, and database client for SmartKlass.

## Overview

SmartKlass uses a **single `User` account type**. Any user can purchase courses, subscribe to plans, and optionally become a creator by creating a `CreatorProfile`. Video content is never uploaded — lessons reference **YouTube links and metadata** only.

## Entity Relationship Summary

```
User ──┬── UserProfile
       ├── CreatorProfile ── Course ──┬── CourseModule ── Lesson ── LessonResource
       │                              ├── AccessPlan ── PlanFeature
       │                              ├── CourseCategory ── Category
       │                              ├── Review / Comment / Favorite
       │                              └── CourseAccess
       ├── UserPurchase ── Payment
       ├── UserSubscription
       └── Notification
```

## Core Product Rules

| Rule | Implementation |
|------|----------------|
| One account type | `User` model only — no separate learner/creator tables |
| Anyone can buy | `UserPurchase` and `UserSubscription` link to `User` |
| Anyone can teach | `CreatorProfile` is optional, 1:1 with `User` |
| Course structure | `Course` → `CourseModule` → `Lesson` |
| No video uploads | `Lesson.youtubeVideoId` + `Lesson.youtubeUrl` + `provider=YOUTUBE` only |
| Multiple plans | `AccessPlan` belongs to `Course`; creators define several |
| Access grants | `CourseAccess` records what a user can watch, tied to purchase or subscription |

## Models

### Users & Profiles

| Model | Purpose |
|-------|---------|
| `User` | Authentication identity and account status |
| `UserProfile` | Display name, avatar, bio, locale |
| `CreatorProfile` | Public creator persona; required to publish courses |

### Catalog

| Model | Purpose |
|-------|---------|
| `Category` | Hierarchical topic taxonomy |
| `CourseCategory` | Many-to-many course ↔ category |
| `Course` | Creator-owned learning product |
| `CourseModule` | Ordered section within a course |
| `Lesson` | YouTube-hosted video lesson (`provider`, `thumbnailUrl`, optional link until publish) |
| `LessonResource` | Supplementary PDFs, links, worksheets |

### Monetization

| Model | Purpose |
|-------|---------|
| `AccessPlan` | Pricing option for a course (free, one-time, subscription) |
| `PlanFeature` | Marketing bullets / entitlements for a plan |
| `Payment` | Stripe-aligned payment record |
| `UserPurchase` | One-time plan purchase |
| `UserSubscription` | Recurring plan subscription |
| `CourseAccess` | **Source of truth** for whether a user can watch a course |

### Engagement

| Model | Purpose |
|-------|---------|
| `Review` | Star rating + written review (one per user per course) |
| `Comment` | Threaded comments on courses or lessons |
| `Favorite` | Saved courses |
| `Notification` | In-app notification inbox |

## Enums

| Enum | Values |
|------|--------|
| `UserStatus` | `ACTIVE`, `INACTIVE`, `SUSPENDED`, `PENDING_VERIFICATION` |
| `CourseStatus` | `DRAFT`, `PENDING_REVIEW`, `PUBLISHED`, `ARCHIVED` |
| `LessonStatus` | `DRAFT`, `PUBLISHED`, `ARCHIVED` |
| `AccessPlanType` | `FREE`, `ONE_TIME`, `SUBSCRIPTION` |
| `SubscriptionStatus` | `ACTIVE`, `TRIALING`, `PAST_DUE`, `CANCELED`, `EXPIRED`, `PAUSED` |
| `PaymentStatus` | `PENDING`, `PROCESSING`, `SUCCEEDED`, `FAILED`, `REFUNDED`, `CANCELED` |
| `PurchaseStatus` | `PENDING`, `COMPLETED`, `FAILED`, `REFUNDED`, `CANCELED` |

Additional enums: `BillingInterval`, `LessonResourceType`, `NotificationType`, `VideoProvider`.

## Access Control Flow

```
User pays for AccessPlan
        │
        ├── ONE_TIME  → UserPurchase + Payment → CourseAccess (optional expiresAt)
        │
        └── SUBSCRIPTION → UserSubscription → CourseAccess (expiresAt = period end)
```

To check if a user can watch a course:

1. Query `CourseAccess` where `userId` + `courseId`
2. Filter: `revokedAt IS NULL`, `deletedAt IS NULL`
3. Filter: `expiresAt IS NULL OR expiresAt > NOW()`
4. Optionally match the specific `accessPlanId` entitlements via `PlanFeature`

Preview lessons (`Lesson.isPreview = true`) are accessible without `CourseAccess`.

## Soft Deletes

Models with `deletedAt` use soft deletion. Application queries should filter `deletedAt: null` by default:

- `User`, `UserProfile`, `CreatorProfile`
- `Category`, `Course`, `CourseModule`, `Lesson`, `LessonResource`
- `AccessPlan`, `UserPurchase`, `UserSubscription`, `CourseAccess`
- `Review`, `Comment`, `Notification`

## Indexes & Constraints

- **Unique slugs:** `CreatorProfile.slug`, `Course.slug`, `Category.slug`
- **Unique emails:** `User.email`
- **One review per user per course:** `@@unique([userId, courseId])` on `Review`
- **One favorite per user per course:** `@@unique([userId, courseId])` on `Favorite`
- **Composite indexes** on foreign keys, status fields, and sort orders for catalog queries

## Commands

From the monorepo root:

```bash
# Start MySQL
docker compose up -d

# Apply migrations (development)
pnpm db:migrate

# Seed sample data
pnpm db:seed

# Open Prisma Studio
pnpm db:studio

# Reset database (drops, migrates, seeds)
pnpm db:reset
```

From this package:

```bash
pnpm db:generate    # Regenerate Prisma Client
pnpm db:migrate     # Create/apply migrations
pnpm db:seed        # Run seed script
pnpm db:studio      # GUI explorer
```

## Seed Data

The seed script (`prisma/seed.ts`) creates:

- 4 users (2 learners, 2 creators)
- 2 creator profiles
- 3 courses with modules and YouTube lessons
- 4 access plans with features
- Sample purchase, subscription, and course access grants
- Reviews, favorites, and comments

Sample accounts (development only):

| Email | Role |
|-------|------|
| `alex@example.com` | Learner with lifetime pasta course access |
| `jordan@example.com` | Learner with monthly pasta subscription |
| `maria@example.com` | Creator — Chef Maria Santos |
| `devon@example.com` | Creator — Devon Brooks |

## Environment

Requires `DATABASE_URL` in the root `.env`:

```
DATABASE_URL="mysql://smartklass:smartklass@localhost:3306/smartklass"
```

## Migrations

Migrations live in `prisma/migrations/`. Never edit applied migration SQL manually — create a new migration for schema changes:

```bash
pnpm db:migrate
# Enter a descriptive name when prompted
```
