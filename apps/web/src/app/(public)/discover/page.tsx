'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { CourseCard } from '@/components';
import { DiscoverFilters } from '@/components/catalog/DiscoverFilters';
import { listPublishedCourses } from '@/lib/api/courses';
import { listCreatorDirectory } from '@/lib/api/creators';
import { summaryToDisplayCourse } from '@/lib/catalog/course-display';
import type { MockCourse } from '@/lib/mock-data';
import type { CatalogSort } from '@/lib/mock-data';

function DiscoverContent() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const [apiCourses, setApiCourses] = useState<MockCourse[]>([]);
  const [creatorNames, setCreatorNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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

  useEffect(() => {
    let cancelled = false;

    void listCreatorDirectory()
      .then((creators) => {
        if (!cancelled) {
          setCreatorNames(
            Object.fromEntries(
              creators.map((item) => [item.slug, item.displayName]),
            ),
          );
        }
      })
      .catch(() => {
        // Creator labels are optional for the page header.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(false);
      try {
        const result = await listPublishedCourses({
          limit: 48,
          search: query || undefined,
          creator: creator !== 'All' ? creator : undefined,
          language: language !== 'All' ? language : undefined,
          certificates: sort === 'certificates' ? true : undefined,
          category:
            category !== 'All'
              ? category.toLowerCase().replace(/\s+/g, '-')
              : undefined,
        });
        if (!cancelled) {
          setApiCourses(
            result.items.map((course) =>
              summaryToDisplayCourse(course, {
                category: category !== 'All' ? category : 'General',
              }),
            ),
          );
        }
      } catch {
        if (!cancelled) {
          setApiCourses([]);
          setError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [query, category, language, creator, sort]);

  const filtered = useMemo(() => apiCourses, [apiCourses]);

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

  const creatorName = creatorNames[creator] ?? creator;

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

      {error && (
        <p className="mt-6 text-sm text-destructive">
          Could not load courses. Check that the API is running.
        </p>
      )}

      {loading ? (
        <p className="mt-10 text-sm text-muted-foreground">{t('common.loading')}</p>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
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
    <Suspense fallback={<div className="px-4 py-12 text-sm text-muted-foreground">Loading…</div>}>
      <DiscoverContent />
    </Suspense>
  );
}
