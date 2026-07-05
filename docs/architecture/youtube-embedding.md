# YouTube Embedding

## Scope

This document covers **technical implementation** of YouTube-backed lessons. Product rationale is in [youtube-video-strategy.md](../product/youtube-video-strategy.md).

## Pipeline

```
┌────────────────┐    POST /lessons/:id/youtube     ┌─────────────────┐
│ Creator Studio │ ─────────────────────────────────►│ LessonsService  │
└────────────────┘                                    └────────┬────────┘
                                                               │
                                                    parseYoutubeUrl()
                                                               │
                                                               ▼
                                                    ┌─────────────────┐
                                                    │ lessons table   │
                                                    │ youtube_video_id│
                                                    │ youtube_url     │
                                                    └────────┬────────┘
                                                               │
     GET /lessons/:id/watch (authorized)                       │
┌────────────────┐ ◄─────────────────────────────────────────────┘
│  Learn UI      │   LessonWatchDto.youtube { embedUrl, videoId }
└────────┬───────┘
         │ <iframe src={embedUrl} />
         ▼
   YouTube CDN
```

## URL parsing

Shared utility: `apps/api/src/common/youtube/parse-youtube-url.ts`

Exports:

- `parseYoutubeUrl(input)` → `{ videoId, normalizedUrl, thumbnailUrl }` or null
- `buildYoutubeWatchUrl(videoId)`
- `buildYoutubeThumbnailUrl(videoId)`

**Single parser** for validation endpoint, lesson attach, and tests — prevents client/server drift.

## API endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/youtube/validate?url=` | Public | Studio + API attach validation |
| GET | `/youtube/oembed/:videoId` | Public | Preview metadata (title optional) |

`YoutubeModule` is intentionally thin — no YouTube Data API key required for v1.

## Lesson attach

`POST /lessons/:id/youtube` with `{ youtubeUrl }`:

1. `CourseOwnerGuard` — creator only
2. Parse URL; reject invalid with 400
3. Persist `youtubeVideoId`, `youtubeUrl`, `provider: YOUTUBE`
4. Optional: fetch thumbnail URL from parser defaults

Duration and title sync from YouTube Data API is **deferred** — manual or oEmbed enrichment later.

## Watch DTO shape

`AccessService.toLessonWatchDto()` returns:

```typescript
youtube: {
  videoId: string;
  embedUrl: `https://www.youtube.com/embed/${videoId}`;
  watchUrl: string;
  thumbnailUrl: string | null;
  provider: 'YOUTUBE';
} | null
```

Null when lesson has no video attached — UI shows placeholder state.

## Web player

Component: `apps/web/src/components/player/YouTubeEmbed.tsx`

Consumed by:

- Learn experience (`LessonPlayer`)
- Creator Studio lesson editor preview (`YoutubeLinkInput`)

### Embed parameters (recommended defaults)

| Param | Value | Reason |
|-------|-------|--------|
| `rel` | `0` | Reduce off-platform recommendations |
| `modestbranding` | `1` | Cleaner chrome |
| `playsinline` | `1` | Mobile behavior |

Implement via embed URL query string when polishing player UX.

## Security boundary

| Concern | Reality |
|---------|---------|
| "Hide" video ID | Not possible — embed requires ID |
| Prevent embedding | YouTube controls embed allowlist per uploader |
| Prevent unauthorized curriculum access | **API watch gating** |

Unauthorized users must not receive structured lesson lists with IDs for paid content. Public course pages may show marketing trailer only.

## Privacy modes

Creators may use **unlisted** YouTube videos:

- Not in YouTube search
- Still embeddable with link
- SmartKlass lesson watch still requires entitlement

Do not document "security through unlisted" — always enforce API access.

## Failure handling

| Failure | UX |
|---------|-----|
| Invalid URL on save | 400 with validation message |
| Video deleted on YouTube | Player error state; creator notified via studio health check (future) |
| YouTube outage | Platform read-only for playback; API still serves metadata |

## Testing

- Unit tests on `parseYoutubeUrl` for URL variants
- Access tests ensure watch DTO only returned when entitled
- E2E: attach URL → watch lesson as entitled user

## Extension points

`VideoProvider` enum currently only `YOUTUBE`. Adding a provider requires:

1. Parser module
2. Lesson attach endpoint generalization
3. Watch DTO discriminated union
4. Web player abstraction

Access control remains unchanged.

## Related

- [ADR-003: YouTube links, no video hosting](../adr/ADR-003-youtube-links-no-video-hosting.md)
- [Access control](./access-control.md)
