'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  addFavorite,
  listMyFavorites,
  removeFavorite,
} from '@/lib/api/favorites';
import { getAuthToken } from '@/lib/api/client';
import { ApiRequestError } from '@/lib/api/types';

type FavoritesContextValue = {
  favoriteSlugs: Set<string>;
  isLoading: boolean;
  isFavorite: (courseSlug: string) => boolean;
  toggleFavorite: (courseSlug: string) => Promise<boolean>;
  refreshFavorites: () => Promise<void>;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [favoriteSlugs, setFavoriteSlugs] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const refreshFavorites = useCallback(async () => {
    const token = getAuthToken();

    if (!token) {
      setFavoriteSlugs(new Set());
      setIsLoading(false);
      return;
    }

    try {
      const items = await listMyFavorites();
      setFavoriteSlugs(new Set(items.map((item) => item.course.slug)));
    } catch {
      setFavoriteSlugs(new Set());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadFavorites() {
      const token = getAuthToken();

      if (!token) {
        if (!cancelled) {
          setFavoriteSlugs(new Set());
          setIsLoading(false);
        }
        return;
      }

      try {
        const items = await listMyFavorites();
        if (!cancelled) {
          setFavoriteSlugs(new Set(items.map((item) => item.course.slug)));
        }
      } catch {
        if (!cancelled) {
          setFavoriteSlugs(new Set());
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadFavorites();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const toggleFavorite = useCallback(
    async (courseSlug: string) => {
      if (!getAuthToken()) {
        router.push(`/login?next=${encodeURIComponent(pathname)}`);
        return false;
      }

      const wasFavorite = favoriteSlugs.has(courseSlug);

      setFavoriteSlugs((current) => {
        const next = new Set(current);
        if (wasFavorite) {
          next.delete(courseSlug);
        } else {
          next.add(courseSlug);
        }
        return next;
      });

      try {
        if (wasFavorite) {
          await removeFavorite(courseSlug);
        } else {
          await addFavorite(courseSlug);
        }
        return !wasFavorite;
      } catch (error) {
        setFavoriteSlugs((current) => {
          const next = new Set(current);
          if (wasFavorite) {
            next.add(courseSlug);
          } else {
            next.delete(courseSlug);
          }
          return next;
        });

        if (error instanceof ApiRequestError && error.status === 401) {
          router.push(`/login?next=${encodeURIComponent(pathname)}`);
        }

        return wasFavorite;
      }
    },
    [favoriteSlugs, pathname, router],
  );

  const value = useMemo(
    () => ({
      favoriteSlugs,
      isLoading,
      isFavorite: (courseSlug: string) => favoriteSlugs.has(courseSlug),
      toggleFavorite,
      refreshFavorites,
    }),
    [favoriteSlugs, isLoading, toggleFavorite, refreshFavorites],
  );

  return (
    <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);

  if (!context) {
    throw new Error('useFavorites must be used within FavoritesProvider');
  }

  return context;
}
