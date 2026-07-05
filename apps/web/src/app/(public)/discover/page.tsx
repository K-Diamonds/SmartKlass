'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { CourseCard } from '@/components';
import { DiscoverFilters } from '@/components/catalog/DiscoverFilters';
import {
  filterCatalogCourses,
  getCreatorByHandle,
  type CatalogSort,
} from '@/lib/mock-data';

function DiscoverContent() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();

  const sort = (
    searchParams.get('sort') === 'recent'
      ? 'recent'
      : searchParams.get('sort') === 'certificates'
        ? 'certificates'
        : 'explore'
  ) as CatalogSort;
  const query = searchParams.get('q') ?? '';
  const category = searchParams.get('category') ?? 'All';
  const language = searchParams.get('language') ?? 'All';
  const creator = searchParams.get('creator') ?? 'All';

  const filtered = filterCatalogCourses({
    category,
    sort,
    query,
    language,
    creator,
  });
  const activeCreator =
    creator !== 'All' ? getCreatorByHandle(creator) : undefined;
  const hasCreatorFilter = creator !== 'All';
  const isRecent = sort === 'recent';
  const isCertificates = sort === 'certificates';

  const titleKey = hasCreatorFilter
    ? 'discover.titleByCreator'
    : isCertificates
      ? 'discover.titleCertificates'
      : isRecent
        ? 'discover.titleRecent'
        : 'discover.titleExplore';
  const subtitleKey = hasCreatorFilter
    ? 'discover.subtitleByCreator'
    : isCertificates
      ? 'discover.subtitleCertificates'
      : isRecent
        ? 'discover.subtitleRecent'
        : 'discover.subtitleExplore';

  const creatorName = activeCreator?.displayName ?? creator;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">
          {t('discover.eyebrow')}
        </p>
        <h1 className="font-display mt-2 text-4xl font-semibold tracking-tight text-foreground">
          {hasCreatorFilter
            ? t(titleKey, { name: creatorName })
            : t(titleKey)}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {hasCreatorFilter
            ? t(subtitleKey, { count: filtered.length, name: creatorName })
            : t(subtitleKey)}
        </p>
      </div>

      <div className="mt-8">
        <DiscoverFilters />
      </div>

      {query && (
        <p className="mt-6 text-sm text-muted-foreground">
          {t('discover.results', { count: filtered.length, query })}
        </p>
      )}

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((course) => (
          <CourseCard key={course.id} course={course} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="mt-16 rounded-3xl border border-dashed border-border bg-surface px-6 py-12 text-center">
          <p className="font-display text-lg font-semibold text-foreground">
            {t('discover.noResultsTitle')}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('discover.noResultsBody')}
          </p>
        </div>
      )}
    </div>
  );
}

export default function DiscoverPage() {
  return (
    <Suspense fallback={null}>
      <DiscoverContent />
    </Suspense>
  );
}
