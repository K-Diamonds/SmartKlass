import type { CourseDetail } from '@/lib/api/courses';
import type { CourseDisplay } from '@/lib/catalog/display-types';

export type CourseSummary = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  thumbnailUrl: string | null;
  estimatedHours: number | null;
  difficultyLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  language: string;
  offersCertificate: boolean;
  category?: string | null;
  creator: {
    slug: string;
    displayName: string;
  };
};

const LEVEL_MAP: Record<CourseSummary['difficultyLevel'], CourseDisplay['level']> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
};

const PLACEHOLDER_THUMB =
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=450&fit=crop&auto=format';

export function summaryToDisplayCourse(
  course: CourseSummary,
  options?: { priceFromCents?: number; category?: string },
): CourseDisplay {
  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    subtitle: course.subtitle ?? '',
    description: '',
    thumbnailUrl: course.thumbnailUrl ?? PLACEHOLDER_THUMB,
    creator: {
      id: course.creator.slug,
      handle: course.creator.slug,
      displayName: course.creator.displayName,
      headline: '',
      bio: '',
      avatarUrl: PLACEHOLDER_THUMB,
      courseCount: 0,
      studentCount: 0,
      rating: 0,
    },
    rating: 0,
    reviewCount: 0,
    subscriberCount: 0,
    viewerCount: 0,
    lessonCount: 0,
    durationHours: course.estimatedHours ?? 0,
    level: LEVEL_MAP[course.difficultyLevel],
    category: options?.category ?? course.category ?? 'General',
    priceFromCents: options?.priceFromCents ?? 0,
    billingInterval: 'monthly',
    hasMultiplePlans: false,
    publishedAt: new Date().toISOString(),
    language: course.language,
    offersCertificate: course.offersCertificate,
  };
}

export function detailToDisplayCourse(
  course: CourseDetail,
  options?: { priceFromCents?: number; category?: string },
): CourseDisplay {
  return {
    ...summaryToDisplayCourse(course, options),
    description: course.description,
    lessonCount: course.lessonCount,
    durationHours: course.estimatedHours ?? 0,
    trailerYoutubeId: course.trailerYoutubeId,
    previewMaterialsDescription: course.previewMaterialsDescription,
    publishedAt: course.publishedAt ?? new Date().toISOString(),
  };
}
