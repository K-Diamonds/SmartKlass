'use client';

import { Heart } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import { cn } from '@/lib/utils';

type FavoriteButtonProps = {
  courseSlug: string;
  className?: string;
};

export function FavoriteButton({ courseSlug, className }: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite, isLoading } = useFavorites();
  const liked = isFavorite(courseSlug);

  return (
    <button
      type="button"
      aria-label={liked ? 'Remove from favorites' : 'Add to favorites'}
      disabled={isLoading}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void toggleFavorite(courseSlug);
      }}
      className={cn(
        'absolute bottom-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md transition-transform hover:scale-110 disabled:opacity-60',
        className,
      )}
      style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
    >
      <Heart
        size={13}
        fill={liked ? 'var(--gold)' : 'none'}
        color={liked ? 'var(--gold)' : 'white'}
      />
    </button>
  );
}
