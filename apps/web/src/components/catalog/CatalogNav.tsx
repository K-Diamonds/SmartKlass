'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { CatalogSort } from '@/lib/catalog/catalog-utils';
import { CatalogSearchInput } from '@/components/catalog/CatalogSearchInput';

type CatalogNavProps = {
  variant?: 'light' | 'dark';
  className?: string;
};

function parseCatalogSort(value: string | null): CatalogSort {
  if (value === 'recent') return 'recent';
  if (value === 'certificates') return 'certificates';
  return 'explore';
}

function buildDiscoverHref(
  sort: CatalogSort,
  query: string | undefined,
  current: URLSearchParams,
) {
  const params = new URLSearchParams(current.toString());

  if (sort === 'recent') {
    params.set('sort', 'recent');
  } else if (sort === 'certificates') {
    params.set('sort', 'certificates');
  } else {
    params.delete('sort');
  }

  if (query?.trim()) {
    params.set('q', query.trim());
  } else {
    params.delete('q');
  }

  const qs = params.toString();
  return `/discover${qs ? `?${qs}` : ''}`;
}

export function CatalogNav({
  variant = 'light',
  className,
}: CatalogNavProps) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const onDiscover = pathname.startsWith('/discover');
  const activeSort = onDiscover ? parseCatalogSort(searchParams.get('sort')) : 'explore';
  const urlQuery = searchParams.get('q') ?? '';

  const isDark = variant === 'dark';

  const tabClass = (active: boolean) =>
    cn(
      'shrink-0 rounded-full px-3 py-2 text-sm font-medium transition-colors sm:px-4',
      isDark
        ? active
          ? 'bg-white text-dark'
          : 'text-white/60 hover:text-white'
        : active
          ? 'bg-foreground text-cream'
          : 'text-muted-foreground hover:text-foreground',
    );

  return (
    <div className={cn('flex min-w-0 items-center gap-2 overflow-visible sm:gap-3', className)}>
      <div className="flex shrink-0 items-center gap-1">
        <Link
          href={buildDiscoverHref('explore', urlQuery, searchParams)}
          className={tabClass(onDiscover && activeSort === 'explore')}
        >
          {t('nav.explore')}
        </Link>
        <Link
          href={buildDiscoverHref('recent', urlQuery, searchParams)}
          className={tabClass(onDiscover && activeSort === 'recent')}
        >
          {t('nav.mostRecent')}
        </Link>
        <Link
          href={buildDiscoverHref('certificates', urlQuery, searchParams)}
          className={tabClass(onDiscover && activeSort === 'certificates')}
        >
          {t('nav.certificates')}
        </Link>
      </div>

      <CatalogSearchInput
        key={urlQuery}
        variant={variant}
        activeSort={activeSort}
        searchParams={searchParams}
        initialQuery={urlQuery}
        buildDiscoverHref={buildDiscoverHref}
      />
    </div>
  );
}
