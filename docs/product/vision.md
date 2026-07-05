# Product Vision

## Executive summary

SmartKlass is a **premium learning marketplace** for practical skills — closer to MasterClass and Coursera in positioning, but built for independent creators who already teach on YouTube. We sell **structured courses**, not raw video hosting. The platform owns discovery, checkout, access control, and the learner experience; creators own their content and audience relationship.

This is a deliberate product choice: we are not competing with YouTube on distribution. We are competing on **curriculum, trust, and monetization infrastructure**.

## The problem we solve

| Stakeholder | Pain today | SmartKlass answer |
|-------------|------------|-------------------|
| **Learners** | Great free content is scattered; paid courses feel either cheap or corporate | Curated catalog, premium UX, clear pricing, resume-anywhere learning |
| **Creators** | YouTube monetization is thin; course platforms take heavy cuts and require re-uploading video | Keep videos on YouTube; sell access via plans we operate (Stripe-backed) |
| **The business** | Video platforms burn capital on CDN and rights | Embed-only video strategy keeps COGS predictable |

## What we are building (v1)

1. **Public marketplace** — discover courses, view creator profiles, read reviews
2. **Learner experience** — purchase or subscribe to a course plan, watch lessons via embedded YouTube, download resources
3. **Creator Studio** — draft → publish workflow, module/lesson builder, access plan configuration, revenue visibility
4. **Payments** — Stripe Checkout for one-time and recurring course plans, webhook-driven fulfillment

## What we are explicitly not building (v1)

- Self-hosted video transcoding or DRM
- Native iOS/Android apps
- Live cohorts, webinars, or community forums
- Platform-wide "all you can eat" subscription (schema supports per-course plans first; platform library is a future layer)
- Open upload marketplace without curation

Saying no here protects margin, security surface area, and time-to-market.

## Strategic principles

### Accessible premium

High production value without intimidation. The UI should feel like Apple meets Stripe — calm, confident, fast. Learners should never wonder whether they are "allowed" to be here.

### Creator-first economics

Creators keep their videos where they already publish. SmartKlass adds **structure** (modules, lessons, resources), **pricing** (free, monthly, yearly, lifetime, premium tiers), and **fulfillment** (access grants, receipts, subscription state).

### Entitlement over roles

We do not model "students" as a platform role. A user becomes a learner when they hold an active `CourseAccess` grant — via purchase, subscription, free plan, preview lesson, or course ownership. This keeps authorization logic honest and auditable.

### YouTube as infrastructure

Video delivery is outsourced to YouTube embeds. We store links and metadata, validate URLs server-side, and gate **watch payloads** — not the iframe itself. Security is enforced at the API boundary.

## Success metrics (north star framing)

| Horizon | Metric | Why it matters |
|---------|--------|----------------|
| Launch | Courses published with ≥1 paying learner | Proves creator + monetization loop |
| Growth | Gross merchandise value (GMV) / active creator | Platform take rate only works if creators earn |
| Retention | Subscription renewal rate per course | Recurring revenue quality signal |
| Quality | Lesson completion rate on paid access | Validates curriculum, not just marketing |

## Positioning for external audiences

**For investors:** Asset-light marketplace with Stripe-native payments, predictable infra costs, and a data model that supports expansion into platform subscriptions and creator payouts without re-architecting access control.

**For engineers:** A modular monolith with a single entitlement service (`AccessService`), explicit ADRs, and a schema designed for purchases, subscriptions, and grants — not RBAC spaghetti.

**For recruiters:** Modern TypeScript stack (Next.js, NestJS, Prisma, MySQL), production-minded patterns (webhook idempotency, guards, soft deletes), and documentation that reflects how we actually ship.

## Roadmap themes (not commitments)

1. **Wire Creator Studio to live APIs** — today the studio UI is production-grade; persistence is the next integration milestone
2. **Creator payouts** — Stripe Connect or equivalent; revenue share configuration
3. **Platform subscription** — cross-course library access layered on existing `CourseAccess`
4. **Moderation & trust** — course review queue (`PENDING_REVIEW` status exists in schema)
5. **Progress & certificates** — learner state stored client-side today; server-side progress is planned

---

*SmartKlass is built for people who teach well and learn seriously — without pretending everyone needs a film crew.*
