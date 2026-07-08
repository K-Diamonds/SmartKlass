# Deployment

SmartKlass supports **Vercel** (API) and **Docker** (self-hosted / local). The pattern matches [CreatorOS](https://github.com/KOfferman/CreatorOS) and [Kortex](https://github.com/K-Diamonds/Kortex): GitHub Actions runs CI, then deploys to Vercel after tests pass. Vercel Git auto-deploy is disabled so failed CI never ships.

## Vercel (NestJS API + Next.js Web)

| App | Vercel project | URL |
|-----|----------------|-----|
| API (`apps/api`) | `smart-klass-api` | [https://smart-klass-api.vercel.app](https://smart-klass-api.vercel.app) |
| Web (`apps/web`) | `smart-klass` | [https://smart-klass.vercel.app](https://smart-klass.vercel.app) |

**Health:** [https://smart-klass-api.vercel.app/api/v1/health](https://smart-klass-api.vercel.app/api/v1/health)

Both projects deploy from the monorepo root via GitHub Actions. Vercel Git auto-deploy is disabled (`vercel.json`).

### 1. Connect Vercel to GitHub

1. Vercel → **smart-klass-api** and **smart-klass** → linked to `K-Diamonds/SmartKlass` (`main`)
2. Root directories: `apps/api` and `apps/web` (set by CI / setup scripts)
3. Root [`vercel.json`](../vercel.json) sets `"git.deploymentEnabled": false`

### 2. Sync env → GitHub

```bash
cp apps/api/.env.vercel.example apps/api/.env.vercel
# Fill VERCEL_TOKEN (https://vercel.com/account/tokens)

./scripts/sync-github-env.sh --repo K-Diamonds/SmartKlass
```

| Store | Examples |
|-------|----------|
| **GitHub Secrets** | `DATABASE_URL`, `JWT_SECRET`, `STRIPE_*`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` |
| **GitHub Variables** | `API_URL`, `NEXT_PUBLIC_API_URL`, `WORKER_ENABLED=false`, `CORS_ALLOW_ORIGINS` |

### 3. Push runtime env to Vercel

GitHub secrets are **not** automatically available to Vercel functions:

```bash
./scripts/push-vercel-env.sh production
```

Required on Vercel (Production):

| Variable | Example |
|----------|---------|
| `DATABASE_URL` | Hosted MySQL connection string |
| `JWT_SECRET` | ≥32 chars |
| `NODE_ENV` | `production` |
| `WORKER_ENABLED` | `false` (serverless — no in-process outbox worker) |
| `API_URL` | `https://smart-klass-api.vercel.app` |
| `CORS_ALLOW_ORIGINS` | `https://smart-klass.vercel.app,http://localhost:3000` |

### 4. Deploy flow

**Push to `main`** → [`.github/workflows/ci.yml`](../.github/workflows/ci.yml):

1. `monorepo` — lint, typecheck, test, build (`CI_LITE=true`, no private DB)
2. `deploy-vercel` — API `vercel deploy --prod` + smoke test `/api/v1/health`
3. `deploy-vercel-web` — Web `vercel deploy --prod` + smoke test homepage

Manual redeploy: **Actions → Redeploy Vercel → Run workflow**

### 5. One-time project setup

```bash
./scripts/setup-vercel-api.sh
./scripts/setup-vercel-web.sh
./scripts/push-vercel-web-env.sh production
```

### Notes

- **Workers:** Outbox/daily jobs are disabled on Vercel (`WORKER_ENABLED=false`). Run workers on a container host if needed.
- **Uploads:** Avatar uploads use local disk in dev; use object storage in production serverless.
- **Stripe webhooks:** Point to `https://smart-klass-api.vercel.app/api/v1/stripe/webhook`
- **MySQL (Hostinger / remote):** Allow external connections from Vercel egress IPs or use a connection pooler. If Prisma fails to connect, add SSL params to `DATABASE_URL` per your host docs.
- **Database seed:** Run `pnpm db:seed` for **local/dev only**. Production already has its own data — do not seed production unless you are initializing an empty database. Empty UI on Vercel is usually `NEXT_PUBLIC_API_URL` pointing at localhost, not missing seed data.
