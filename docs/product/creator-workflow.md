# Creator Workflow

## Overview

The creator journey is designed to feel like **YouTube Studio** (content organization), **Stripe Dashboard** (money clarity), and **Coursera instructor tools** (curriculum structure). Creators never upload video bytes to SmartKlass — they **link YouTube**, **structure curriculum**, **price access**, and **publish**.

## Lifecycle

```
Apply / onboard → Create course (draft) → Build curriculum → Configure plans → Publish → Iterate
```

| Stage | Creator action | Platform behavior |
|-------|----------------|-------------------|
| Onboard | Complete creator profile (`CreatorProfile`) | Slug, headline, public `/creators/[handle]` page |
| Draft | Create course with title, slug, description | `Course.status = DRAFT`; not purchasable |
| Build | Add modules, lessons, resources, YouTube URLs | Ordering via `sortOrder`; reorder endpoints |
| Price | Create access plans per course | Plans map to Stripe prices on first checkout |
| Review | Submit for publication (optional queue) | `PENDING_REVIEW` supported in schema |
| Publish | Publish course | `PUBLISHED`; checkout enabled; catalog visible |
| Operate | Monitor subscribers, revenue, reviews | Creator Studio dashboards |
| Archive | Retire course | `ARCHIVED`; existing grants honored per policy |

## Creator Studio (web)

Route group: `/studio/*`

| Page | Purpose |
|------|---------|
| Dashboard | KPIs, recent courses, quick actions |
| Courses | List drafts, published, archived |
| Create course | Title, slug, description, thumbnail |
| Course builder | Drag-and-drop module and lesson ordering |
| Module builder | Module metadata + lesson list |
| Lesson editor | YouTube URL, preview embed, resources, visibility |
| Access plans | Free, Monthly, Yearly, Lifetime, VIP tiers |
| Subscribers | Active and past-due subscribers |
| Revenue | GMV trends, per-course breakdown |
| Reviews | Moderation queue |
| Settings | Profile, notifications, Stripe Connect (planned) |

Studio UI is production-grade. API integration is the active engineering milestone — the workflow below reflects **target end-to-end behavior** aligned with existing NestJS modules.

## Curriculum authoring

### Course structure

```
Course
 └── CourseModule (ordered)
      └── Lesson (ordered)
           ├── YouTube video (optional but expected)
           └── LessonResource (PDF, link, worksheet, etc.)
```

**Module operations (API):**

- `POST /courses/:id/modules` — create
- `POST /courses/:id/modules/reorder` — batch reorder
- `PATCH /modules/:id` — update
- `DELETE /modules/:id` — soft delete

**Lesson operations (API):**

- `POST /modules/:id/lessons` — create
- `POST /modules/:id/lessons/reorder` — batch reorder
- `PATCH /lessons/:id` — update metadata, status, `isPreview`
- `POST /lessons/:id/youtube` — attach validated YouTube URL
- `POST /lessons/:id/resources` — attach downloadable/link resources

### Lesson visibility

| Flag | Effect |
|------|--------|
| `status: DRAFT` | Hidden from learners; visible in studio |
| `status: PUBLISHED` | Eligible for catalog and watch resolution |
| `isPreview: true` | Watchable without purchase (marketing funnel) |

Preview lessons are the top-of-funnel. They must be explicitly marked — we do not leak unpublished or paid content via guessable IDs without `AccessService` checks.

### YouTube attachment flow

1. Creator pastes URL in lesson editor
2. Client may preview embed immediately (UX)
3. On save, API validates via `GET /youtube/validate?url=...`
4. API stores `youtubeVideoId`, `youtubeUrl`, optional `thumbnailUrl`, `durationSeconds`
5. Watch endpoints return embed metadata only when access is granted

See [YouTube video strategy](./youtube-video-strategy.md).

## Monetization setup

Creators configure **per-course access plans**:

| Marketing label | Schema mapping |
|-----------------|----------------|
| Free | `AccessPlanType.FREE` |
| Monthly | `SUBSCRIPTION` + `BillingInterval.MONTHLY` |
| Yearly | `SUBSCRIPTION` + `BillingInterval.YEARLY` |
| Lifetime | `ONE_TIME` (no expiry on grant) |
| VIP | `ONE_TIME` at premium price + `PlanFeature` rows for positioning |

Plans are created via `POST /courses/:id/access-plans` and updated with `PATCH /access-plans/:id`. Stripe Price IDs are lazily created on first checkout (`stripePriceId` on plan).

Free plans do not use Stripe Checkout — fulfillment grants access directly when implemented.

## Publication gates

Before publish, the platform should enforce (policy layer — some rules are product, not yet all automated):

- At least one published module with one published lesson
- Course metadata complete (title, description, thumbnail)
- At least one active access plan
- YouTube links valid on published lessons (warning vs hard block — product decision)

**API endpoints:**

- `POST /courses/:id/publish`
- `POST /courses/:id/archive`
- `PATCH /courses/:id` for metadata edits

`CourseOwnerGuard` ensures only the owning creator mutates content.

## Post-publish operations

| Activity | Studio surface | Backend source |
|----------|----------------|----------------|
| New subscriber | Subscribers table | `UserSubscription` + Stripe webhooks |
| One-time purchase | Revenue + subscribers | `UserPurchase` + `Payment` |
| Refund / revoke | Admin (future) | `CourseAccess.revokedAt` |
| Review received | Reviews page | `Review` with `isPublished` moderation |
| Plan change | Access plans | New Stripe price on next checkout; grandfathering policy TBD |

## Creator experience principles

1. **Never make creators re-upload video** — link and validate
2. **Show money in cents correctly** — Stripe discipline in UI (`formatPrice`)
3. **Make ordering tactile** — drag-and-drop in builder; API reorder is source of truth
4. **Separate draft from live** — status badges everywhere; no accidental publish
5. **Owner bypass** — creators always preview their full course without purchasing

## Integration status

| Capability | API | Studio UI |
|------------|-----|-----------|
| Course CRUD | ✅ | 🔶 Mock data |
| Module / lesson reorder | ✅ | ✅ Client-side demo |
| YouTube validate | ✅ | ✅ |
| Access plans CRUD | ✅ | ✅ Client-side demo |
| Stripe checkout | ✅ | 🔶 Public course page |
| Watch experience | ✅ | ✅ `/learn/...` |

Legend: ✅ shipped · 🔶 partial / mock

## Related documentation

- [YouTube video strategy](./youtube-video-strategy.md)
- [Subscription model](./subscription-model.md)
- [Architecture: payments](../architecture/payments.md)
