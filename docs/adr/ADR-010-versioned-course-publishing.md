# ADR-010: Versioned course publishing

**Status:** Accepted  
**Date:** 2026-07-06  
**Deciders:** Engineering

## Context

Creators edit live courses in place. A half-finished lesson edit can appear to subscribers. Enterprise LMS platforms use versioned publish workflows with rollback.

## Decision

Introduce `course_versions` with JSON snapshots:

1. **Draft** — `POST /courses/:id/versions/draft` snapshots current tree
2. **Publish** — promotes draft; archives previous published version
3. **Rollback** — re-publishes an archived version instantly
4. **Pointer** — `courses.published_version_id` + `current_version_number`

Phase 1 stores snapshots and manages version metadata. Phase 2 serves learner content from published snapshot only.

## Consequences

**Positive**

- Instant rollback without git-style complexity
- Foundation for scheduled releases
- Differentiates SmartKlass from typical course builders

**Negative**

- Snapshot storage grows with edits
- Studio UI must adopt version workflow (future)
- Dual read path until Phase 2 complete

## Related

- [versioned-publishing.md](../architecture/versioned-publishing.md)
