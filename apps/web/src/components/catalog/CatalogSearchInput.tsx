'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FormEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import type { CatalogSort } from '@/lib/catalog/catalog-utils';
import { buildCatalogSearchSuggestions } from '@/lib/catalog/search-index';
import { useCatalogSearchIndex } from '@/hooks/useCatalogSearchIndex';
import { cn } from '@/lib/utils';

type CatalogSearchInputProps = {
  variant?: 'light' | 'dark';
  activeSort: CatalogSort;
  searchParams: URLSearchParams;
  initialQuery?: string;
  buildDiscoverHref: (
    sort: CatalogSort,
    query: string | undefined,
    current: URLSearchParams,
  ) => string;
};

export function CatalogSearchInput({
  variant = 'light',
  activeSort,
  searchParams,
  initialQuery = '',
  buildDiscoverHref,
}: CatalogSearchInputProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const listboxId = useId();
  const inputId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(initialQuery);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const catalogIndex = useCatalogSearchIndex();

  const isDark = variant === 'dark';

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const searchParamsKey = searchParams.toString();

  const suggestions = useMemo(
    () =>
      buildCatalogSearchSuggestions(query, catalogIndex, {
        searchParams: new URLSearchParams(searchParamsKey),
      }),
    [catalogIndex, query, searchParamsKey],
  );

  const trimmedQuery = query.trim();
  const showSuggestions =
    isOpen && trimmedQuery.length > 0 && suggestions.length > 0;

  const navigateToSearch = (value: string) => {
    router.push(buildDiscoverHref(activeSort, value, searchParams));
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (activeIndex >= 0 && suggestions[activeIndex]) {
      router.push(suggestions[activeIndex].href);
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }

    navigateToSearch(query);
  };

  const suggestionTypeLabel = (type: 'course' | 'creator' | 'category') => {
    switch (type) {
      case 'course':
        return t('nav.searchSuggestionCourse');
      case 'creator':
        return t('nav.searchSuggestionCreator');
      case 'category':
        return t('nav.searchSuggestionCategory');
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative min-w-0 w-[clamp(8.5rem,18vw,14rem)] shrink overflow-visible"
    >
      <form onSubmit={handleSubmit}>
        <Search
          size={14}
          className={cn(
            'pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2',
            isDark ? 'text-white/40' : 'text-muted-foreground',
          )}
        />
        <label htmlFor={inputId} className="sr-only">
          {t('nav.searchPlaceholder')}
        </label>
        <input
          id={inputId}
          name="q"
          type="search"
          value={query}
          autoComplete="off"
          role="combobox"
          aria-expanded={showSuggestions}
          aria-controls={showSuggestions ? listboxId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
          }
          placeholder={t('nav.searchPlaceholder')}
          onFocus={() => {
            if (query.trim()) {
              setIsOpen(true);
            }
          }}
          onChange={(event) => {
            const nextValue = event.target.value;
            setQuery(nextValue);
            setIsOpen(nextValue.trim().length > 0);
            setActiveIndex(-1);

            if (!nextValue.trim() && searchParams.get('q')) {
              router.push(buildDiscoverHref(activeSort, '', searchParams));
            }
          }}
          onKeyDown={(event) => {
            if (!showSuggestions) {
              if (event.key === 'ArrowDown' && query.trim()) {
                setIsOpen(true);
              }
              return;
            }

            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setActiveIndex((current) =>
                current < suggestions.length - 1 ? current + 1 : 0,
              );
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setActiveIndex((current) =>
                current > 0 ? current - 1 : suggestions.length - 1,
              );
            } else if (event.key === 'Escape') {
              setIsOpen(false);
              setActiveIndex(-1);
            }
          }}
          className={cn(
            'w-full rounded-full py-2 pl-9 pr-3 text-sm outline-none transition-colors',
            isDark
              ? 'border border-white/10 bg-white/10 text-white placeholder:text-white/35 focus:border-white/25 focus:bg-white/15'
              : 'border border-border bg-surface text-foreground placeholder:text-muted-foreground focus:border-accent/40 focus:ring-2 focus:ring-ring',
          )}
        />
      </form>

      {showSuggestions && (
        <ul
          id={listboxId}
          role="listbox"
          className={cn(
            'absolute left-0 top-[calc(100%+0.5rem)] z-[60] max-h-72 min-w-[16rem] w-max max-w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border p-1 shadow-card',
            isDark
              ? 'border-white/10 bg-dark text-white'
              : 'border-border bg-surface text-foreground',
          )}
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.id}
              id={`${listboxId}-option-${index}`}
              role="option"
              aria-selected={activeIndex === index}
            >
              <Link
                href={suggestion.href}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setQuery(suggestion.label);
                  setIsOpen(false);
                  setActiveIndex(-1);
                }}
                className={cn(
                  'block rounded-xl px-3 py-2.5 transition-colors',
                  activeIndex === index
                    ? isDark
                      ? 'bg-white/10'
                      : 'bg-muted'
                    : isDark
                      ? 'hover:bg-white/10'
                      : 'hover:bg-muted/70',
                )}
              >
                <span className="block truncate text-sm font-medium">
                  {suggestion.label}
                </span>
                <span
                  className={cn(
                    'mt-0.5 block truncate text-xs',
                    isDark ? 'text-white/55' : 'text-muted-foreground',
                  )}
                >
                  {suggestion.sublabel
                    ? `${suggestionTypeLabel(suggestion.type)} · ${suggestion.sublabel}`
                    : suggestionTypeLabel(suggestion.type)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
