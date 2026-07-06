# Search strategy (future)

SmartKlass catalog search today uses MySQL `LIKE` on `courses.title` and `subtitle`. This is sufficient for hundreds of courses.

## When to upgrade

| Catalog size | Approach |
|--------------|----------|
| < 1,000 courses | MySQL full-text or `LIKE` (current) |
| 1,000 – 50,000 | **Meilisearch** (recommended) |
| 50,000+ | OpenSearch / Elasticsearch |

## Recommended: Meilisearch

Why Meilisearch for SmartKlass:

- Typo tolerance for course/creator names
- Faceted filters (category, language, certificate, creator)
- Sub-50ms queries at moderate scale
- Simpler ops than Elasticsearch

## Index schema (draft)

```json
{
  "id": "course_uuid",
  "title": "Pasta Basics",
  "subtitle": "...",
  "creatorName": "Chef Maria",
  "creatorSlug": "chef-maria",
  "categorySlugs": ["culinary"],
  "language": "en",
  "offersCertificate": true,
  "publishedAt": 1717200000,
  "priceFromCents": 2900
}
```

## Sync strategy

1. **Outbox consumer** — on `CoursePublished` / version publish, upsert Meilisearch doc
2. **Nightly reconcile** — compare DB published count vs index count
3. **Admin reindex** — `POST /admin/search/reindex` (future)

## API surface (future)

```
GET /api/v1/search/courses?q=pasta&category=culinary&sort=relevance
```

Falls back to `GET /courses?search=` when Meilisearch unavailable.

## Related

- [Versioned publishing](./versioned-publishing.md)
- [Scaling plan](./scaling-plan.md)
