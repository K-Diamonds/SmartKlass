export type ParsedYoutubeVideo = {
  videoId: string;
  normalizedUrl: string;
  thumbnailUrl: string;
};

const YOUTUBE_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

export function buildYoutubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export function buildYoutubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function parseYoutubeUrl(input: string): ParsedYoutubeVideo | null {
  let url: URL;

  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }

  const hostname = url.hostname.replace(/^www\./, '').toLowerCase();
  let videoId: string | null = null;

  if (hostname === 'youtu.be') {
    videoId = url.pathname.split('/').filter(Boolean)[0] ?? null;
  } else if (hostname === 'youtube.com' || hostname === 'm.youtube.com') {
    if (url.pathname === '/watch') {
      videoId = url.searchParams.get('v');
    } else if (url.pathname.startsWith('/embed/')) {
      videoId = url.pathname.split('/')[2] ?? null;
    } else if (url.pathname.startsWith('/shorts/')) {
      videoId = url.pathname.split('/')[2] ?? null;
    }
  }

  if (!videoId || !YOUTUBE_ID_PATTERN.test(videoId)) {
    return null;
  }

  const normalizedUrl = buildYoutubeWatchUrl(videoId);

  return {
    videoId,
    normalizedUrl,
    thumbnailUrl: buildYoutubeThumbnailUrl(videoId),
  };
}
