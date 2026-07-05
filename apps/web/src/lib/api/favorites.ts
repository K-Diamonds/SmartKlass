import { apiFetch, apiFetchPaginated } from './client';

export type FavoriteCourse = {
  slug: string;
  title: string;
  subtitle: string | null;
  thumbnailUrl: string | null;
  language: string;
  creator: {
    slug: string;
    displayName: string;
    avatarUrl: string | null;
  };
};

export type FavoriteItem = {
  id: string;
  courseId: string;
  createdAt: string;
  course: FavoriteCourse;
};

export async function listMyFavorites(): Promise<FavoriteItem[]> {
  return apiFetchPaginated<FavoriteItem>('/favorites/me?limit=100');
}

export function addFavorite(courseSlug: string): Promise<FavoriteItem> {
  return apiFetch<FavoriteItem>('/favorites', {
    method: 'POST',
    body: JSON.stringify({ courseSlug }),
  });
}

export function removeFavorite(courseSlug: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(
    `/favorites/by-slug/${encodeURIComponent(courseSlug)}`,
    { method: 'DELETE' },
  );
}
