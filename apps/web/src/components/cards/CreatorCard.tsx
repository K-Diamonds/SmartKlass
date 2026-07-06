import Link from 'next/link';
import Image from 'next/image';
import { Star } from 'lucide-react';
import type { CreatorDisplay } from '@/lib/catalog/display-types';
import { discoverCreatorUrl } from '@/lib/discover';
import { cn } from '@/lib/utils';

type CreatorCardProps = {
  creator: CreatorDisplay;
  variant?: 'light' | 'dark';
  className?: string;
};

function fmtCount(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}

export function CreatorCard({
  creator,
  variant = 'light',
  className,
}: CreatorCardProps) {
  if (variant === 'dark') {
    return (
      <Link
        href={discoverCreatorUrl(creator.handle)}
        className={cn(
          'group overflow-hidden rounded-3xl bg-[#161614] shadow-elevated transition-all duration-300 hover:-translate-y-1',
          className,
        )}
      >
        <div className="relative h-32 overflow-hidden bg-zinc-800">
          <Image
            src={creator.avatarUrl}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 320px"
            className="object-cover opacity-50 transition-transform duration-500 group-hover:scale-105"
          />
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to bottom, transparent 40%, #161614)' }}
          />
        </div>
        <div className="relative -mt-8 px-5 pb-5">
          <Image
            src={creator.avatarUrl}
            alt={creator.displayName}
            width={64}
            height={64}
            className="mb-3 rounded-2xl border-2 border-accent object-cover"
          />
          <h3 className="font-display mb-0.5 font-semibold text-white">
            {creator.displayName}
          </h3>
          <p className="mb-4 text-xs text-muted-foreground">{creator.headline}</p>
          <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
            <span>{creator.courseCount} courses</span>
            <span>{fmtCount(creator.studentCount)} students</span>
            <span className="flex items-center gap-1">
              <Star size={10} fill="var(--gold)" color="var(--gold)" />
              {creator.rating}
            </span>
          </div>
          <span className="block w-full rounded-full bg-accent py-2.5 text-center text-sm font-semibold text-accent-foreground">
            View profile
          </span>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={discoverCreatorUrl(creator.handle)}
      className={cn(
        'group flex flex-col items-center rounded-3xl border border-border bg-surface p-6 text-center shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-card',
        className,
      )}
    >
      <Image
        src={creator.avatarUrl}
        alt={creator.displayName}
        width={80}
        height={80}
        className="rounded-2xl border-2 border-accent object-cover"
      />

      <h3 className="font-display mt-4 text-lg font-semibold tracking-tight text-foreground group-hover:text-accent">
        {creator.displayName}
      </h3>
      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{creator.headline}</p>

      <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
        <span>{creator.courseCount} courses</span>
        <span className="flex items-center gap-1">
          <Star size={11} fill="var(--gold)" color="var(--gold)" />
          {creator.rating}
        </span>
      </div>
    </Link>
  );
}
