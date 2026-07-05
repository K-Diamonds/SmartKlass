import {
  buildYoutubeThumbnailUrl,
  buildYoutubeWatchUrl,
  parseYoutubeUrl,
} from './parse-youtube-url';

describe('parseYoutubeUrl', () => {
  it('parses youtube.com/watch URLs', () => {
    const result = parseYoutubeUrl(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ&feature=share',
    );

    expect(result).toEqual({
      videoId: 'dQw4w9WgXcQ',
      normalizedUrl: buildYoutubeWatchUrl('dQw4w9WgXcQ'),
      thumbnailUrl: buildYoutubeThumbnailUrl('dQw4w9WgXcQ'),
    });
  });

  it('parses youtu.be URLs', () => {
    const result = parseYoutubeUrl('https://youtu.be/dQw4w9WgXcQ');

    expect(result?.videoId).toBe('dQw4w9WgXcQ');
    expect(result?.normalizedUrl).toBe(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    );
  });

  it('parses youtube.com/embed URLs', () => {
    const result = parseYoutubeUrl('https://www.youtube.com/embed/dQw4w9WgXcQ');

    expect(result?.videoId).toBe('dQw4w9WgXcQ');
    expect(result?.thumbnailUrl).toContain('dQw4w9WgXcQ');
  });

  it('returns null for invalid URLs', () => {
    expect(parseYoutubeUrl('https://example.com/video')).toBeNull();
    expect(parseYoutubeUrl('not-a-url')).toBeNull();
    expect(parseYoutubeUrl('https://www.youtube.com/watch?v=short')).toBeNull();
  });
});
