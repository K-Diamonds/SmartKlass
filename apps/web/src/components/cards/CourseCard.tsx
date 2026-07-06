'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Clock, Star, Users } from 'lucide-react';
import type { CourseDisplay } from '@/lib/catalog/display-types';
import { CourseImageBadge } from '@/components/course/CourseImageBadge';
import { CourseLanguageBadge } from '@/components/course/CourseLanguageBadge';
import { FavoriteButton } from '@/components/course/FavoriteButton';
import { coursePublicUrl } from '@/lib/courses';
import { cn, formatCoursePrice } from '@/lib/utils';

function coursePriceOptions(course: CourseDisplay) {
  return {
    priceCents: course.priceFromCents,
    billingInterval: course.billingInterval ?? 'lifetime',
    hasMultiplePlans: course.hasMultiplePlans ?? false,
  };
}

type CourseCardProps = {
  course: CourseDisplay;
  variant?: 'default' | 'featured' | 'compact';
  className?: string;
  showFavorite?: boolean;
};

const languageBadgeClass =
  'shrink-0 rounded-full bg-dark/75 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur-sm';

function fmtCount(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}

function CourseMetaRow({ course }: { course: CourseDisplay }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
        <span>{course.category}</span>
        <span>·</span>
        <span>{course.level}</span>
      </div>
      <span className={languageBadgeClass}>
        <CourseLanguageBadge language={course.language} />
      </span>
    </div>
  );
}

export function CourseCard({
  course,
  variant = 'default',
  className,
  showFavorite = true,
}: CourseCardProps) {
  if (variant === 'compact') {
    return (
      <Link
        href={coursePublicUrl(course.id)}
        className={cn(
          'group w-72 shrink-0 overflow-hidden rounded-3xl bg-surface shadow-card transition-all duration-300 hover:-translate-y-1',
          className,
        )}
      >
        <div className="relative h-44 overflow-hidden bg-muted">
          <Image
            src={course.thumbnailUrl}
            alt={course.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="288px"
          />
          <div className="absolute inset-0 bg-black/20 transition-colors group-hover:bg-black/30" />
          <CourseImageBadge offersCertificate={course.offersCertificate} />
          {showFavorite && (
            <FavoriteButton courseSlug={course.slug} />
          )}
        </div>
        <div className="p-4">
          <CourseMetaRow course={course} />
          <h3 className="mb-2 line-clamp-2 text-sm font-semibold leading-snug text-foreground">
            {course.title}
          </h3>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Star size={10} fill="var(--gold)" color="var(--gold)" />
              {course.rating}
            </span>
            <span className="font-bold text-foreground">
              {formatCoursePrice({ ...coursePriceOptions(course), compact: true })}
            </span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={coursePublicUrl(course.id)}
      className={cn(
        'group flex flex-col overflow-hidden rounded-3xl border border-border bg-surface shadow-card transition-all duration-300 hover:-translate-y-1',
        variant === 'featured' && 'md:flex-row',
        className,
      )}
    >
      <div
        className={cn(
          'relative overflow-hidden bg-muted',
          variant === 'featured' ? 'aspect-[16/10] md:w-2/5' : 'aspect-[16/10]',
        )}
      >
        <Image
          src={course.thumbnailUrl}
          alt={course.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 400px"
        />
        <div className="absolute inset-0 bg-black/10 transition-colors group-hover:bg-black/20" />
        <CourseImageBadge offersCertificate={course.offersCertificate} />
        {showFavorite && (
          <FavoriteButton courseSlug={course.slug} />
        )}
      </div>

      <div className={cn('flex flex-1 flex-col p-5', variant === 'featured' && 'justify-center')}>
        <CourseMetaRow course={course} />

        <h3 className="font-display text-lg font-semibold tracking-tight text-foreground group-hover:text-accent">
          {course.title}
        </h3>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{course.subtitle}</p>

        <div className="mt-4 flex items-center gap-3">
          <Image
            src={course.creator.avatarUrl}
            alt={course.creator.displayName}
            width={28}
            height={28}
            className="rounded-full object-cover"
          />
          <span className="text-sm text-muted-foreground">{course.creator.displayName}</span>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-sm">
          <div className="flex items-center gap-3 text-muted-foreground">
            <span className="flex items-center gap-1">
              <Star size={11} fill="var(--gold)" color="var(--gold)" />
              {course.rating}
            </span>
            <span className="flex items-center gap-1">
              <Users size={11} />
              {fmtCount(course.subscriberCount)}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {course.lessonCount}
            </span>
          </div>
          <span className="font-semibold text-foreground">
            {formatCoursePrice({
              ...coursePriceOptions(course),
              freeLabel: 'Free preview',
            })}
          </span>
        </div>
      </div>
    </Link>
  );
}
