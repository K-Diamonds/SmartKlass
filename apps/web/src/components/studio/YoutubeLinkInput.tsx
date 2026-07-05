'use client';

import { useMemo, useState } from 'react';
import { YouTubeEmbed } from '@/components/player/YouTubeEmbed';
import { cn } from '@/lib/utils';

function extractYoutubeVideoId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.slice(1) || null;
    }
    if (parsed.hostname.includes('youtube.com')) {
      if (parsed.pathname.startsWith('/embed/')) {
        return parsed.pathname.split('/')[2] ?? null;
      }
      return parsed.searchParams.get('v');
    }
  } catch {
    return null;
  }

  return null;
}

type YoutubeLinkInputProps = {
  value: string;
  onChange: (value: string) => void;
  onVideoIdChange?: (videoId: string | null) => void;
  className?: string;
};

export function YoutubeLinkInput({
  value,
  onChange,
  onVideoIdChange,
  className,
}: YoutubeLinkInputProps) {
  const [touched, setTouched] = useState(false);
  const videoId = useMemo(() => extractYoutubeVideoId(value), [value]);
  const isValid = Boolean(videoId);

  const handleChange = (next: string) => {
    onChange(next);
    onVideoIdChange?.(extractYoutubeVideoId(next));
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div>
        <label htmlFor="youtube-url" className="block text-sm font-medium text-foreground">
          YouTube URL
        </label>
        <p className="mt-1 text-xs text-muted-foreground">
          Paste a watch, youtu.be, or embed link. Videos are streamed via YouTube — no uploads.
        </p>
        <input
          id="youtube-url"
          type="url"
          value={value}
          onChange={(event) => handleChange(event.target.value)}
          onBlur={() => setTouched(true)}
          placeholder="https://www.youtube.com/watch?v=..."
          className={cn(
            'mt-2 w-full rounded-xl border bg-background px-4 py-3 text-sm outline-none ring-ring focus:ring-2',
            touched && value && !isValid ? 'border-danger' : 'border-border',
          )}
        />
        {touched && value && !isValid && (
          <p className="mt-2 text-xs text-danger">
            Enter a valid YouTube URL (watch, youtu.be, or embed).
          </p>
        )}
        {isValid && (
          <p className="mt-2 text-xs text-emerald-600">Video ID: {videoId}</p>
        )}
      </div>

      {isValid && videoId && (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface p-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Preview
          </p>
          <YouTubeEmbed videoId={videoId} title="Lesson video preview" />
        </div>
      )}
    </div>
  );
}
