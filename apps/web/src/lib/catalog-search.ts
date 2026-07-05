import { coursePublicUrl } from '@/lib/courses';
import { discoverCreatorUrl } from '@/lib/discover';
import {
  mockCategories,
  mockCourses,
  mockCreators,
} from '@/lib/mock-data';

export type CatalogSearchSuggestion = {
  id: string;
  label: string;
  sublabel: string;
  href: string;
  type: 'course' | 'creator' | 'category';
};

function matchesQuery(values: string[], query: string) {
  return values.some((value) => value.toLowerCase().includes(query));
}

export function getCatalogSearchSuggestions(
  query: string,
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

  for (const course of mockCourses) {
    if (
      matchesQuery(
        [
          course.title,
          course.subtitle,
          course.description,
          course.category,
          course.creator.displayName,
          course.creator.handle,
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

  for (const creator of mockCreators) {
    if (
      matchesQuery(
        [creator.displayName, creator.handle, creator.headline],
        normalized,
      )
    ) {
      suggestions.push({
        id: `creator-${creator.handle}`,
        label: creator.displayName,
        sublabel: creator.headline,
        href: discoverCreatorUrl(creator.handle),
        type: 'creator',
      });
    }
  }

  for (const category of mockCategories) {
    if (category === 'All') {
      continue;
    }

    if (category.toLowerCase().includes(normalized)) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('category', category);
      params.delete('q');
      const qs = params.toString();
      suggestions.push({
        id: `category-${category}`,
        label: category,
        sublabel: '',
        href: `/discover${qs ? `?${qs}` : ''}`,
        type: 'category',
      });
    }
  }

  return suggestions.slice(0, limit);
}
