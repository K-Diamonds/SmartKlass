import type { CourseDisplay } from './display-types';

export type CatalogSort = 'explore' | 'recent' | 'certificates';

/** Explore tab: subscribers first, then rating, then creator catalog depth. */
export function compareExploreCourses(
  a: Pick<CourseDisplay, 'subscriberCount' | 'rating' | 'reviewCount' | 'creator'>,
  b: Pick<CourseDisplay, 'subscriberCount' | 'rating' | 'reviewCount' | 'creator'>,
): number {
  if (b.subscriberCount !== a.subscriberCount) {
    return b.subscriberCount - a.subscriberCount;
  }

  if (b.rating !== a.rating) {
    return b.rating - a.rating;
  }

  if (b.creator.courseCount !== a.creator.courseCount) {
    return b.creator.courseCount - a.creator.courseCount;
  }

  return b.reviewCount - a.reviewCount;
}

/** Trending: most viewers first, then most recently published. */
export function compareTrendingCourses(
  a: Pick<CourseDisplay, 'viewerCount' | 'publishedAt'>,
  b: Pick<CourseDisplay, 'viewerCount' | 'publishedAt'>,
): number {
  if (b.viewerCount !== a.viewerCount) {
    return b.viewerCount - a.viewerCount;
  }

  return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
}
