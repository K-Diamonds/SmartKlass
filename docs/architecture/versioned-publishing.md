# Versioned course publishing

Enterprise-quality CMS: creators edit **draft versions** while subscribers see a stable **published version**.

## Workflow

```
Published v12 (live)
       │
       ▼ Edit
Draft v13 (snapshot)
       │
       ▼ Preview
       │
       ▼ Publish
Published v13 (live) — v12 archived
```

## API

| Method | Path | Action |
|--------|------|--------|
| `POST` | `/courses/:id/versions/draft` | Snapshot live course → new draft |
| `GET` | `/courses/:id/versions` | List versions |
| `POST` | `/courses/:id/versions/:versionId/publish` | Promote draft to live |
| `POST` | `/courses/:id/versions/:versionId/rollback` | Re-publish archived version |

## Schema

- `course_versions` — JSON snapshot of course tree + plans
- `courses.published_version_id` — pointer to live version
- `courses.current_version_number` — monotonic counter

## Benefits

| Benefit | How |
|---------|-----|
| Instant rollback | Re-publish archived version |
| No broken lessons mid-edit | Subscribers read published snapshot |
| Scheduled releases | `scheduled_for` on draft (future job) |
| Audit trail | Version history per course |

## Learner experience

Public course pages serve content from `published_version_id` snapshot (Phase 2). Today, publishing updates metadata on `courses` and stores snapshot for rollback.

## Related

- [ADR-010](../adr/ADR-010-versioned-course-publishing.md)
- [Creator workflow](../product/creator-workflow.md)
