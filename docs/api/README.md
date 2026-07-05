# SmartKlass API

Base URL (development): `http://localhost:4000/api/v1`

All successful responses use this envelope:

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

Errors use:

```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Description of the failure"
  }
}
```

## Authentication

JWT-based auth. Send the access token as `Authorization: Bearer <token>` unless the route is marked public.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/auth/register` | Public | Create account + receive tokens |
| `POST` | `/auth/login` | Public | Authenticate + receive tokens |
| `POST` | `/auth/refresh` | Public | Exchange refresh token |
| `GET` | `/auth/me` | Required | Current user summary |
| `GET` | `/users/me` | Required | Full user profile |
| `PATCH` | `/users/me` | Required | Update user profile |
| `POST` | `/creators/become-creator` | Required | Create `CreatorProfile` |

## Health

| Method | Path | Auth |
|--------|------|------|
| `GET` | `/health` | Public |

## Catalog (public)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/courses` | Published course listing |
| `GET` | `/courses/:slug` | Course detail by slug |
| `GET` | `/courses/:courseId/modules` | Modules (published courses only) |
| `GET` | `/modules/:moduleId/lessons` | Published lessons (no YouTube IDs) |
| `GET` | `/lessons/:id` | Published lesson summary (no video URLs) |
| `GET` | `/courses/:courseId/access-plans` | Active plans for published course |
| `GET` | `/creators/:slug` | Public creator profile |
| `GET` | `/youtube/validate?url=` | Validate YouTube URL |
| `GET` | `/youtube/oembed/:videoId` | Embed preview metadata |

## Watch (access-controlled)

Video metadata is only returned from watch endpoints after entitlement checks.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/courses/:id/access` | Required | Access status for course |
| `GET` | `/courses/:id/watch` | Required + grant | Full course syllabus + embed data |
| `GET` | `/lessons/:id/watch` | Optional | Lesson watch; preview lessons work without login |

## Creator builder

Requires `Authorization: Bearer <token>` and `CreatorProfile`. Course owner only.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/courses` | Create draft course |
| `PATCH` | `/courses/:id` | Update course metadata |
| `POST` | `/courses/:id/publish` | Publish course |
| `POST` | `/courses/:id/archive` | Archive course |
| `POST` | `/courses/:id/modules` | Create module |
| `POST` | `/courses/:id/modules/reorder` | Reorder modules |
| `PATCH` | `/modules/:id` | Update module |
| `POST` | `/modules/:id/lessons` | Create lesson |
| `POST` | `/modules/:id/lessons/reorder` | Reorder lessons |
| `PATCH` | `/lessons/:id` | Update lesson |
| `POST` | `/lessons/:id/youtube` | Attach YouTube URL |
| `POST` | `/lessons/:id/resources` | Add lesson resource |
| `POST` | `/courses/:id/access-plans` | Create access plan |
| `PATCH` | `/access-plans/:id` | Update access plan |

## Billing (Stripe)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/checkout/course-plan` | Required | Create Stripe Checkout session |
| `POST` | `/stripe/webhook` | Public (signed) | Stripe webhook handler |
| `GET` | `/billing/me` | Required | Purchases + subscriptions summary |
| `GET` | `/purchases/me` | Required | Purchase history |
| `GET` | `/subscriptions/me` | Required | Subscription history |

## Scaffolded (501)

These modules expose routes but return `501 Not Implemented` until completed:

- Categories (`/categories`)
- Favorites (`/favorites`)
- Reviews (write paths; public read for course reviews)
- Comments (write paths; public read)
- Notifications (`/notifications`)
- Payments listing (`/payments`)

## Environment

Validated on API startup:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | MySQL connection string |
| `NODE_ENV` | No | `development` / `production` / `test` |
| `API_PORT` | No | Default `4000` |
| `JWT_SECRET` | Production only | Min 32 characters |
| `STRIPE_SECRET_KEY` | For checkout | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | For webhooks | Webhook signing secret |

## Architecture

Modular monolith under `apps/api/src/modules/`. Shared infrastructure in `apps/api/src/common/`:

- `AccessService` — entitlement resolution
- `PrismaService` — database client
- `GlobalExceptionFilter` — consistent errors
- `ResponseInterceptor` — consistent success envelope
- `ValidationPipe` — global DTO validation

See [docs/architecture/overview.md](../architecture/overview.md).
