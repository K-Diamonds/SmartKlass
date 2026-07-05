# User Roles & Identity Model

## The short version

SmartKlass has **one user account type** and **two optional profiles**. We do not assign a "student" role. Access to paid content is determined by **entitlements** (purchases, subscriptions, grants), not by role membership.

This is intentional. Role-based shortcuts ("if student, allow") collapse under real-world edge cases: creators who also buy courses, refunded purchases, expired subscriptions, preview lessons, and staff impersonation.

## Identity stack

```
User (authentication)
 ├── UserProfile (learner-facing identity: display name, avatar, bio)
 └── CreatorProfile (optional — instructor identity: slug, headline, courses)
```

| Entity | Purpose | Cardinality |
|--------|---------|-------------|
| `User` | Email/password auth, billing relationships, notifications | 1 per person |
| `UserProfile` | How the person appears when commenting, reviewing, learning | 1:1 with User |
| `CreatorProfile` | Public creator page, course ownership | 0..1 per User |

A person can be **learner-only**, **creator-only**, or **both** without switching accounts.

## What we do not have

| Anti-pattern | Why we avoided it |
|--------------|-------------------|
| `STUDENT` role | Conflates identity with commercial relationship |
| `ADMIN` role in product schema | Operational admin is an deployment concern; not modeled in v1 product tables |
| Separate auth providers per persona | Increases support burden and breaks "creator buys a peer's course" |

## Capability matrix

Capabilities are derived from **context**, not a role enum.

| Capability | How it is granted |
|------------|-------------------|
| Browse public catalog | Unauthenticated or authenticated — public endpoints |
| Purchase / subscribe | Authenticated `User` |
| Watch full course | Active `CourseAccess` grant OR course ownership |
| Watch preview lesson | `lesson.isPreview === true` and lesson published |
| Edit course content | `CreatorProfile` owns the course (`CourseOwnerGuard`) |
| Manage access plans | Course owner |
| View Creator Studio | User with `CreatorProfile` (UI gate; API uses owner guards) |
| Leave reviews | Authenticated user with course relationship (future: completed purchase) |

## Authentication

- **Mechanism:** JWT access tokens (global `JwtAuthGuard` on API; `@Public()` opts out)
- **Storage (web):** `localStorage.smartklass_token` for learner/watch flows
- **Password storage:** bcrypt hashes on `User.passwordHash`

Authentication answers *who are you*. Authorization answers *what may you do right now* — and that second question is almost always answered by `AccessService`, not by roles.

## Creator activation

Creators are not a separate signup flow in the data model. A `CreatorProfile` row is created when a user is onboarded as an instructor (application, invite, or internal provisioning).

Implications:

- Same JWT works for `/learn/...` and `/studio/...`
- Course ownership checks compare `course.creatorProfile.userId === currentUser.id`
- Creators automatically receive full watch access to their own courses (`AccessGrantSource.CREATOR_OWNER`)

## Learner activation

There is no "become a student" step. Learner state emerges when:

1. User registers / logs in
2. User completes Stripe Checkout (or is granted free access)
3. `BillingFulfillmentService` writes `UserPurchase` or `UserSubscription` and a `CourseAccess` row
4. `AccessService` resolves the grant on watch requests

## User lifecycle states

`User.status` tracks account health, not learning progress:

| Status | Meaning |
|--------|---------|
| `PENDING_VERIFICATION` | Registered; email not verified (default) |
| `ACTIVE` | Normal operation |
| `INACTIVE` | Voluntary or administrative deactivation |
| `SUSPENDED` | Policy enforcement |

Soft delete via `deletedAt` preserves referential integrity for purchases and reviews.

## Implications for product and engineering

**Product:** Copy should say "get access" or "start learning," not "enroll as a student." Creator Studio copy should say "your workspace," not a separate product login.

**Engineering:** New features should ask "what entitlement is required?" before "what role is required?" If you need a new access path, extend `AccessGrantSource` and fulfillment — do not add a role.

**Investors / compliance:** Entitlement ledger (`course_access`) is the audit trail for who paid for what, when it expires, and whether it was revoked. This is the table finance and support will care about.

## Related documentation

- [Subscriber access model](./subscriber-access-model.md)
- [Architecture: access control](../architecture/access-control.md)
- [ADR-004: Single user, multi-capability model](../adr/ADR-004-single-user-multi-role-model.md)
