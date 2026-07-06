'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { FilterSelect } from '@/components/ui/FilterSelect';
import { SUPPORTED_COURSE_LANGUAGES } from '@smartklass/shared';
import { listCategories } from '@/lib/api/categories';
import { listCreatorDirectory } from '@/lib/api/creators';
import { cn } from '@/lib/utils';

type DiscoverFiltersProps = {
  className?: string;
};

const labelClassName =
  'mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground';

const discoverSelectClassName =
  'w-full appearance-none rounded-xl border border-border bg-surface py-2.5 pl-4 pr-11 text-sm text-foreground outline-none ring-ring focus:ring-2';

function buildDiscoverUrl(
  current: URLSearchParams,
  updates: Record<string, string | null>,
) {
  const params = new URLSearchParams(current.toString());
  for (const [key, value] of Object.entries(updates)) {
    if (!value || value === 'All') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  }
  const qs = params.toString();
  return `/discover${qs ? `?${qs}` : ''}`;
}

export function DiscoverFilters({ className }: DiscoverFiltersProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [categories, setCategories] = useState<string[]>(['All']);
  const [creators, setCreators] = useState<
    { handle: string; displayName: string }[]
  >([]);

  const category = searchParams.get('category') ?? 'All';
  const language = searchParams.get('language') ?? 'All';
  const creator = searchParams.get('creator') ?? 'All';

  useEffect(() => {
    let cancelled = false;

    async function loadFilters() {
      try {
        const [categoryRows, creatorRows] = await Promise.all([
          listCategories(),
          listCreatorDirectory(),
        ]);

        if (cancelled) {
          return;
        }

        setCategories(['All', ...categoryRows.map((row) => row.name)]);
        setCreators(
          creatorRows.map((row) => ({
            handle: row.slug,
            displayName: row.displayName,
          })),
        );
      } catch {
        if (!cancelled) {
          setCategories(['All']);
          setCreators([]);
        }
      }
    }

    void loadFilters();

    return () => {
      cancelled = true;
    };
  }, []);

  const updateFilter = (key: string, value: string) => {
    router.push(buildDiscoverUrl(searchParams, { [key]: value }));
  };

  return (
    <div className={cn(className)}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="filter-category" className={labelClassName}>
            {t('discover.filters.category')}
          </label>
          <FilterSelect
            id="filter-category"
            value={category}
            onChange={(value) => updateFilter('category', value)}
            selectClassName={discoverSelectClassName}
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'All' ? t('discover.filters.all') : cat}
              </option>
            ))}
          </FilterSelect>
        </div>

        <div>
          <label htmlFor="filter-language" className={labelClassName}>
            {t('discover.filters.language')}
          </label>
          <FilterSelect
            id="filter-language"
            value={language}
            onChange={(value) => updateFilter('language', value)}
            selectClassName={discoverSelectClassName}
          >
            <option value="All">{t('discover.filters.all')}</option>
            {SUPPORTED_COURSE_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {t(`languages.${lang.code}`)}
              </option>
            ))}
          </FilterSelect>
        </div>

        <div>
          <label htmlFor="filter-creator" className={labelClassName}>
            {t('discover.filters.creator')}
          </label>
          <FilterSelect
            id="filter-creator"
            value={creator}
            onChange={(value) => updateFilter('creator', value)}
            selectClassName={discoverSelectClassName}
          >
            <option value="All">{t('discover.filters.all')}</option>
            {creators.map((item) => (
              <option key={item.handle} value={item.handle}>
                {item.displayName}
              </option>
            ))}
          </FilterSelect>
        </div>
      </div>
    </div>
  );
}
