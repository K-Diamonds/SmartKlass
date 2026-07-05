# YouTube Video Strategy

## Strategic decision

SmartKlass does **not** host, transcode, or deliver video. All lesson playback uses **YouTube embeds**. Creators upload to their own YouTube channels (public or unlisted, per creator policy) and paste links into the lesson editor.

This is a COGS and complexity decision, not a compromise on UX.

## Why YouTube-only

| Factor | Self-hosted streaming | YouTube embed strategy |
|--------|----------------------|------------------------|
| **Infrastructure cost** | Storage, CDN, encoding, DRM | Near-zero marginal cost |
| **Time to market** | Months (pipeline, player, analytics) | Weeks (URL validation + iframe) |
| **Creator workflow** | Re-upload to our bucket | Use existing channel and audience |
| **Reliability** | We own uptime | YouTube owns uptime |
| **Legal / copyright** | Platform liability increases | Creator retains YouTube relationship |

Trade-off: we depend on YouTube's availability, embed policies, and ad behavior. We accept that in exchange for capital efficiency at seed stage.

## What we store

Per `Lesson`:

| Field | Purpose |
|-------|---------|
| `youtubeVideoId` | Canonical 11-char ID for embed construction |
| `youtubeUrl` | Normalized watch URL for creator reference |
| `thumbnailUrl` | Optional override; default from YouTube thumbnail CDN |
| `durationSeconds` | Optional; for progress UI and catalog |
| `provider` | `YOUTUBE` enum — extensibility hook without commitment |

We do **not** store video binaries, HLS manifests, or signed playback URLs.

## Validation pipeline

```
Creator pastes URL → parseYoutubeUrl() → store IDs → watch API returns embed metadata
```

**Server endpoints:**

- `GET /api/v1/youtube/validate?url=` — parse and normalize; reject invalid URLs
- `GET /api/v1/youtube/oembed/:videoId` — lightweight metadata for studio preview

**Supported URL shapes:**

- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://www.youtube.com/embed/VIDEO_ID`

Parsing lives in `apps/api/src/common/youtube/parse-youtube-url.ts` — single source of truth for API and lesson attach flows.

## Playback architecture

```
┌─────────────┐     JWT + access check     ┌─────────────┐
│  apps/web   │ ───────────────────────────► │  apps/api   │
│  Learn UI   │ ◄── LessonWatchDto ─────── │ AccessService│
└──────┬──────┘     (includes embed URL)   └─────────────┘
       │
       │ iframe src = youtube.com/embed/VIDEO_ID
       ▼
┌─────────────┐
│   YouTube   │
└─────────────┘
```

**Security model:**

- The iframe URL is not secret — obscurity is not security
- **Authorization is enforced before returning watch DTOs**
- Client-side players must use watch API responses, not construct lesson payloads from public catalog data
- Preview lessons are the only intentional leak for non-paying users

## Creator guidelines (product policy)

Recommended creator playbook:

1. Upload lesson to YouTube (unlisted if they want to avoid search discovery outside SmartKlass)
2. Paste link in Creator Studio lesson editor
3. Mark select lessons as **preview** for marketing
4. Keep chapter structure in SmartKlass modules — YouTube playlists are not our curriculum source of truth

## Trailer videos

Courses support `trailerYoutubeId` at the course level for landing page hero video — same embed strategy, public marketing context.

## Future considerations (not v1)

| Idea | When to reconsider |
|------|-------------------|
| Vimeo / Wistia providers | Enterprise creators require DRM or domain locking |
| YouTube Data API for duration/title sync | Reduces manual metadata entry; needs API key quota management |
| Private YouTube + signed embed | YouTube Partner Program restrictions make this fragile |
| Self-hosted for "VIP tier" | Only if unit economics justify dedicated streaming COGS |

Any new provider must extend `VideoProvider` enum, parsing module, and watch DTO — not fork access logic.

## Compliance and terms

Creators represent they have rights to embed content they link. SmartKlass terms should require:

- Own or licensed content on linked videos
- No pirated third-party material
- Acceptance of YouTube Terms of Service downstream

Platform moderation (`PENDING_REVIEW` course status) is the enforcement lever before publish.

## Related documentation

- [Creator workflow](./creator-workflow.md)
- [Architecture: YouTube embedding](../architecture/youtube-embedding.md)
- [ADR-003: YouTube links, no video hosting](../adr/ADR-003-youtube-links-no-video-hosting.md)
