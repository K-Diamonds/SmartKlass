# Multi-region scaling (future)

SmartKlass runs single-region today (US). This document captures the **thought process** for global expansion without premature implementation.

## Target topology

```
                    ┌─────────────┐
                    │  Cloudflare │
                    │     CDN     │
                    └──────┬──────┘
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
      US-East          Europe           Asia
      (primary)        (replica)        (replica)
           │               │               │
           ▼               ▼               ▼
      MySQL primary   Read replica    Read replica
      API + workers   API (read)      API (read)
```

## Data classification

| Data | Strategy |
|------|----------|
| Course catalog | CDN + read replicas; eventual consistency OK |
| User sessions / JWT | Region-sticky or global auth service |
| Payments / ledger | **Single writer** (US-East); Stripe is global |
| Creator payouts | Stripe Connect; creator country determines account |
| Video | YouTube embeds — no regional video hosting |

## Phased rollout

### Phase 1 — CDN only (now)

- Static assets + Next.js on Vercel/Cloudflare
- API remains single region

### Phase 2 — Read replicas

- Route `GET /courses`, `GET /admin/queries/*` to nearest replica
- Writes always to primary

### Phase 3 — Regional API

- EU API for GDPR data residency (user profiles)
- Cross-region replication lag < 1s for catalog

## What we do NOT do early

- Multi-primary MySQL (split-brain risk)
- Regional Stripe accounts per sale (marketplace complexity)
- Geo-sharded user IDs

## Compliance triggers

| Regulation | Driver |
|------------|--------|
| GDPR | EU user data residency |
| PCI | Stripe handles; we never store PAN |

## Related

- [Scaling plan](./scaling-plan.md)
- [Disaster recovery](./disaster-recovery.md)
