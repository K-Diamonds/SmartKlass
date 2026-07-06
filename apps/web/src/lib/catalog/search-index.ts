import { coursePublicUrl } from '@/lib/courses';
import { discoverCreatorUrl } from '@/lib/discover';
import type { Category } from '@/lib/api/categories';
import type { CourseSummary } from '@/lib/api/courses';
import type { CreatorDirectoryItem } from '@/lib/api/creators';

export type CatalogSearchSuggestion = {
  id: string;
  label: string;
  sublabel: string;
  href: string;
  type: 'course' | 'creator' | 'category';
};

export type CatalogSearchIndex = {
  courses: CourseSummary[];
  creators: CreatorDirectoryItem[];
  categories: Category[];
};

function matchesQuery(values: string[], query: string) {
  return values.some((value) => value.toLowerCase().includes(query));
}

export function buildCatalogSearchSuggestions(
  query: string,
  index: CatalogSearchIndex,
  options?: {
    searchParams?: URLSearchParams;
    limit?: number;
  },
): CatalogSearchSuggestion[] {
  const searchParams = options?.searchParams ?? new URLSearchParams();
  const limit = options?.limit ?? 8;
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return [];
  }

  const suggestions: CatalogSearchSuggestion[] = [];

  for (const course of index.courses) {
    if (
      matchesQuery(
        [
          course.title,
          course.subtitle ?? '',
          course.creator.displayName,
          course.creator.slug,
        ],
        normalized,
      )
    ) {
      suggestions.push({
        id: `course-${course.id}`,
        label: course.title,
        sublabel: course.creator.displayName,
        href: coursePublicUrl(course.id),
        type: 'course',
      });
    }
  }

  for (const creator of index.creators) {
    if (matchesQuery([creator.displayName, creator.slug], normalized)) {
      suggestions.push({
        id: `creator-${creator.slug}`,
        label: creator.displayName,
        sublabel: '',
        href: discoverCreatorUrl(creator.slug),
        type: 'creator',
      });
    }
  }

  for (const category of index.categories) {
    if (
      matchesQuery([category.name, category.slug], normalized)
    ) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('category', category.name);
      params.delete('q');
      const qs = params.toString();
      suggestions.push({
        id: `category-${category.slug}`,
        label: category.name,
        sublabel: '',
        href: `/discover${qs ? `?${qs}` : ''}`,
        type: 'category',
      });
    }
  }

  return suggestions.slice(0, limit);
}
