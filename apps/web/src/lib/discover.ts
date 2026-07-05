export function discoverUrl(params?: Record<string, string | null | undefined>): string {
  const search = new URLSearchParams();

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value && value !== 'All') {
        search.set(key, value);
      }
    }
  }

  const qs = search.toString();
  return `/discover${qs ? `?${qs}` : ''}`;
}

export function discoverCreatorUrl(handle: string): string {
  return discoverUrl({ creator: handle });
}
