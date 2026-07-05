# Access Control

## Philosophy

Authorization in SmartKlass answers one question: **does this user have a valid entitlement to this content right now?**

We do not ask: "is this user a student?" Role-based access control (RBAC) is reserved for future internal admin tooling, not learner/creator authorization.

The single source of truth is **`AccessService`** (`apps/api/src/common/access/access.service.ts`).

## Threat model (application layer)

| Threat | Mitigation |
|--------|------------|
| Unauthenticated catalog scraping | Public endpoints return marketing-safe fields only |
| IDOR on lessons | Watch endpoints require access check per lesson |
| JWT tampering | Signed JWT with server secret |
| Replay of webhook grants | `ProcessedStripeEvent` idempotency |
| Creator editing another's course | `CourseOwnerGuard` |
| Expired subscription still watching | Grant resolution checks subscription status + period |

We assume HTTPS termination at the edge. We do not implement DRM on video — see [youtube-embedding.md](./youtube-embedding.md).

## Authentication layer

```
Request → JwtAuthGuard (global) → unless @Public()
       → JwtStrategy validates token → user attached to request
```

Public routes include: auth register/login, health, catalog browse, YouTube validate, some lesson metadata.

Authenticated routes include: checkout, billing history, watch endpoints, creator mutations.

## Authorization layers

### Layer 1: Ownership guards

`CourseOwnerGuard` — mutating course content requires:

```
course.creatorProfile.userId === currentUser.id
```

Applied to: course update, publish, module/lesson CRUD, access plan management.

### Layer 2: Entitlement guards

| Guard | Decorator | Checks |
|-------|-----------|--------|
| `RequireCourseAccessGuard` | `@RequireCourseAccess('id')` | `AccessService.canViewCourse()` |
| `RequireLessonAccessGuard` | `@RequireLessonAccess('id')` | `AccessService.canViewLesson()` |

Used on watch and sensitive read endpoints.

### Layer 3: Programmatic checks

Services call `AccessService` directly for composite operations (e.g., returning partial syllabus with locked markers — future).

## Access resolution algorithm

```
resolveCourseAccess(user, course):
  if isCourseOwner(user, course) → GRANT (CREATOR_OWNER)
  grant = findActiveCourseGrant(user, course.id)
  if grant is valid:
    if grant linked to subscription:
      require subscription ACTIVE|TRIALING and period not ended
    require plan active
    return GRANT (mapped source by plan type)
  return DENY
```

```
canViewLesson(user, lesson):
  if resolveCourseAccess → GRANT
  if lesson.isPreview && lesson.status == PUBLISHED → GRANT (preview only)
  return DENY
```

## Grant sources (API contract)

Exposed in `CourseAccessStatusDto` for UI:

| `source` | UI copy example |
|----------|-----------------|
| `CREATOR_OWNER` | "You own this course" |
| `LIFETIME_PURCHASE` | "Lifetime access" |
| `SUBSCRIPTION_WEEKLY` | "Weekly member" |
| `SUBSCRIPTION_MONTHLY` | "Monthly member" |
| `SUBSCRIPTION_YEARLY` | "Annual member" |
| `FREE_PLAN` | "Free access" |
| `PREVIEW` | "Preview lesson" |

## Watch API contract

**Course watch** (`GET /courses/:id/watch`):

- Requires full course access
- Returns published modules/lessons only
- Includes YouTube embed metadata for entitled user

**Lesson watch** (`GET /lessons/:id/watch`):

- Requires lesson-level access (including preview)
- Returns single lesson DTO

The web learn experience (`LearnExperience`, `lib/api/watch.ts`) consumes **only** these endpoints — not public catalog APIs — for player data.

## Preview lessons

`is_preview` is a **deliberate authorization bypass** for marketing:

- Must be explicitly set by creator
- Lesson must be `PUBLISHED`
- Does not grant access to non-preview lessons

Product must not auto-preview paid content.

## Creator bypass

Owners always pass `canViewCourse` for their content regardless of grants. This enables:

- Studio preview without self-purchase
- QA before publish
- Support reproduction with owner account

## Failure modes

| Condition | HTTP | Message pattern |
|-----------|------|-----------------|
| No JWT on protected route | 401 | Unauthorized |
| JWT valid, no access | 403 | "You do not have access to watch..." |
| Course not published (learner context) | 404 | Course not found (no enumeration) |
| Lesson deleted | 404 | Lesson not found |

We prefer **404 on unpublished courses** for learners to avoid catalog leakage.

## Caching considerations

Do not cache watch responses across users. If CDN caching is introduced for public assets, watch DTOs remain `Cache-Control: private, no-store`.

Access grants can change mid-session (subscription lapse webhook). Client should handle 403 on navigation gracefully.

## Testing strategy

Unit tests cover:

- Owner access
- Active purchase grant
- Active subscription grant
- Expired subscription denial
- Preview lesson access without grant
- Non-preview denial without grant

See `access.service.spec.ts`, `access.guards.spec.ts`.

## Anti-patterns (do not ship)

```typescript
// ❌ Role check
if (user.role === 'STUDENT') return true;

// ❌ Client-side only gating
if (localStorage.purchased) showVideo();

// ❌ Duplicate grant logic in controller
const purchase = await prisma.userPurchase.findFirst(...);
```

```typescript
// ✅ Delegate to AccessService
return this.accessService.canViewLesson(userId, lessonId);
```

## Related

- [Product: subscriber access model](../product/subscriber-access-model.md)
- [Product: user roles](../product/user-roles.md)
- [ADR-004: Single user, multi-capability model](../adr/ADR-004-single-user-multi-role-model.md)
