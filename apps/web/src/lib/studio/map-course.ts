import type { CourseDetail } from '@/lib/api/courses';
import { difficultyLabelFromApi } from '@/lib/studio/course-difficulty';
import type { CourseDifficulty, LessonStatus, StudioCourse } from './types';

export type CreatorCourseStudio = CourseDetail & {
  certificatePaidAt: string | null;
  activeSubscriberCount: number;
  modules: Array<{
    id: string;
    courseId: string;
    title: string;
    description: string | null;
    sortOrder: number;
    lessons: Array<{
      id: string;
      moduleId: string;
      title: string;
      description: string | null;
      materialsDescription: string | null;
      status: string;
      isPreview: boolean;
      sortOrder: number;
      durationSeconds: number | null;
      youtubeVideoId: string | null;
      youtubeUrl: string | null;
      resources: Array<{
        id: string;
        title: string;
        description: string | null;
        resourceType: string;
        url: string;
        purchaseUrl: string | null;
        accessMode: string;
      }>;
    }>;
  }>;
};

export function toStudioCourse(course: CourseDetail): StudioCourse {
  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    subtitle: course.subtitle,
    description: course.description,
    status: course.status === 'PENDING_REVIEW' ? 'DRAFT' : course.status,
    thumbnailUrl: course.thumbnailUrl,
    trailerYoutubeId: course.trailerYoutubeId,
    trailerYoutubeUrl: null,
    previewMaterialsDescription: course.previewMaterialsDescription,
    estimatedHours: course.estimatedHours,
    difficultyLevel: difficultyLabelFromApi(course.difficultyLevel),
    lessonCount: course.lessonCount,
    moduleCount: course.moduleCount,
    studentCount: 0,
    revenueCents: 0,
    rating: 0,
    modules: [],
    offersCertificate: course.offersCertificate,
    certificatePaidAt: null,
  };
}

function normalizeLessonStatus(status: string): LessonStatus {
  return status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT';
}

export function apiCourseToStudioCourse(course: CreatorCourseStudio): StudioCourse {
  const studioCourse = toStudioCourse(course);

  return {
    ...studioCourse,
    studentCount: course.activeSubscriberCount ?? 0,
    offersCertificate: course.offersCertificate,
    certificatePaidAt: course.certificatePaidAt,
    trailerYoutubeUrl: course.trailerYoutubeId
      ? `https://www.youtube.com/watch?v=${course.trailerYoutubeId}`
      : null,
    modules: course.modules.map((module) => ({
      id: module.id,
      courseId: module.courseId,
      title: module.title,
      description: module.description ?? '',
      sortOrder: module.sortOrder,
      lessons: module.lessons.map((lesson) => ({
        id: lesson.id,
        moduleId: lesson.moduleId,
        title: lesson.title,
        description: lesson.description ?? '',
        materialsDescription: lesson.materialsDescription ?? '',
        status: normalizeLessonStatus(lesson.status),
        isPreview: lesson.isPreview,
        sortOrder: lesson.sortOrder,
        durationSeconds: lesson.durationSeconds,
        youtubeVideoId: lesson.youtubeVideoId,
        youtubeUrl: lesson.youtubeUrl,
        resources: lesson.resources.map((resource) => ({
          id: resource.id,
          title: resource.title,
          description: resource.description ?? '',
          resourceType: resource.resourceType,
          url: resource.url,
          purchaseUrl: resource.purchaseUrl ?? '',
          accessMode: (resource.accessMode ?? 'INCLUDED') as StudioCourse['modules'][number]['lessons'][number]['resources'][number]['accessMode'],
        })),
      })),
    })),
  };
}
