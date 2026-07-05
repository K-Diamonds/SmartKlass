# ADR-003: YouTube Links, No Video Hosting

## Status

**Accepted** — 2026

## Context

Course platforms traditionally invest heavily in video infrastructure: upload pipelines, transcoding (HLS/DASH), CDN egress, DRM, and playback analytics. For SmartKlass at seed stage:

- Creators already publish on YouTube
- Video bandwidth is the dominant COGS driver for competitors
- Engineering time is better spent on **entitlements and payments** than ffmpeg pipelines

We needed a video strategy that supports premium UX without becoming a media company.

## Decision

**SmartKlass will not host, transcode, or stream video files.**

Instead:

1. Creators link YouTube videos per lesson (`youtubeVideoId`, `youtubeUrl`)
2. Server validates URLs via `parseYoutubeUrl()`
3. Authorized learners receive embed metadata through watch APIs
4. Web client renders standard YouTube iframes

`VideoProvider` enum is fixed to `YOUTUBE` until a future ADR approves additional providers.

## Consequences

### Positive

- **Near-zero video COGS** — marginal cost does not scale with watch hours
- **Faster creator onboarding** — no re-upload wait states
- **Smaller security surface** — no user-generated binary uploads on our storage
- **Simpler compliance** — creators maintain YouTube relationship

### Negative

- Dependent on YouTube embed policies and availability
- Limited control over ads on embedded player (YouTube Premium users see fewer)
- "Unlisted" is not a security boundary — API gating is mandatory
- Offline viewing not supported

### Product

- Preview lessons use `is_preview` flag — not video privacy settings alone
- Course trailers use `trailerYoutubeId` — same embed model

## Alternatives considered

| Alternative | Rejected because |
|-------------|------------------|
| Mux / Cloudflare Stream | Monthly minimums + engineering before revenue |
| S3 + CloudFront self-build | Transcoding pipeline scope |
| Vimeo private | Per-video cost; creator friction |
| Peer-to-peer / torrent | Incompatible with premium brand |

## Revisit triggers

Write a new ADR if:

- Enterprise customers require DRM or domain-locked playback
- YouTube API/policy changes break embed reliability at scale
- ARR supports dedicated streaming COGS line item

## References

- [YouTube video strategy](../product/youtube-video-strategy.md)
- [YouTube embedding](../architecture/youtube-embedding.md)
