import type { ModuleItem } from '@/components/player/LessonPlayer';
import type { MockCourse } from '@/lib/mock-data';
import { COURSE_THUMBNAIL_FALLBACK } from '@/components/course/CourseThumbnailImage';
import type { StudioAccessPlan, StudioCourse, StudioPlanKind } from './types';

const previewCreator = {
  id: 'preview_creator',
  handle: 'creator',
  displayName: 'Course Creator',
  headline: 'SmartKlass creator',
  bio: '',
  avatarUrl:
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop',
  courseCount: 1,
  studentCount: 0,
  rating: 0,
};

const defaultThumbnail = COURSE_THUMBNAIL_FALLBACK;

function billingIntervalFromKind(
  kind: StudioPlanKind | undefined,
): MockCourse['billingInterval'] {
  switch (kind) {
    case 'WEEKLY':
      return 'weekly';
    case 'MONTHLY':
      return 'monthly';
    case 'YEARLY':
      return 'yearly';
    case 'LIFETIME':
    case 'VIP':
      return 'lifetime';
    default:
      return 'monthly';
  }
}

function lowestActivePaidPlan(plans: StudioAccessPlan[] | undefined) {
  if (!plans?.length) {
    return null;
  }

  return (
    plans
      .filter((plan) => plan.isActive && plan.kind !== 'FREE' && plan.priceCents > 0)
      .sort((left, right) => left.priceCents - right.priceCents)[0] ?? null
  );
}

export function studioCourseToMockCourse(
  course: StudioCourse,
  plans?: StudioAccessPlan[],
): MockCourse {
  const lowestPaid = lowestActivePaidPlan(plans);
  const activePaidCount =
    plans?.filter((plan) => plan.isActive && plan.kind !== 'FREE').length ?? 0;

  return {
    id: course.id,
    slug: course.slug || course.id,
    title: course.title,
    subtitle: course.subtitle ?? '',
    description: course.description,
    thumbnailUrl: course.thumbnailUrl ?? defaultThumbnail,
    creator: previewCreator,
    rating: course.rating,
    reviewCount: 0,
    lessonCount: course.lessonCount,
    durationHours: course.estimatedHours ?? 0,
    level: course.difficultyLevel,
    category: 'Course',
    priceFromCents: lowestPaid?.priceCents ?? 0,
    billingInterval: billingIntervalFromKind(lowestPaid?.kind),
    hasMultiplePlans: activePaidCount > 1,
    publishedAt: new Date().toISOString(),
    language: 'en-US',
    offersCertificate: course.offersCertificate,
    trailerYoutubeId: course.trailerYoutubeId,
    previewMaterialsDescription: course.previewMaterialsDescription,
  };
}

export function studioCourseToModuleItems(course: StudioCourse): ModuleItem[] {
  return course.modules
    .filter((module) => module.lessons.length > 0)
    .map((module) => ({
      id: module.id,
      title: module.title,
      description: module.description,
      lessons: module.lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        materialsDescription: lesson.materialsDescription,
        durationSeconds: lesson.durationSeconds ?? 0,
        isPreview: lesson.isPreview,
        youtubeVideoId: lesson.youtubeVideoId ?? '',
        resources: lesson.resources.map((resource) => ({
          id: resource.id,
          title: resource.title,
          description: resource.description,
          resourceType: resource.resourceType,
          url: resource.url,
          purchaseUrl: resource.purchaseUrl,
          accessMode: resource.accessMode,
        })),
      })),
    }));
}
