import type { LessonDetail } from '@/lib/api/lessons';
import type { LessonStatus, StudioLesson } from './types';

export type LessonFormValues = {
  title: string;
  description: string;
  materialsDescription: string;
  status: LessonStatus;
  youtubeUrl: string | null;
  youtubeVideoId: string | null;
  resources: StudioLesson['resources'];
};

export function createStudioLessonId(): string {
  return `les_${Math.random().toString(36).slice(2, 9)}`;
}

export function createStudioLesson(
  moduleId: string,
  sortOrder: number,
  values: LessonFormValues,
): StudioLesson {
  return {
    id: createStudioLessonId(),
    moduleId,
    title: values.title.trim(),
    description: values.description.trim(),
    materialsDescription: values.materialsDescription.trim(),
    status: values.status,
    isPreview: false,
    sortOrder,
    durationSeconds: null,
    youtubeVideoId: values.youtubeVideoId,
    youtubeUrl: values.youtubeUrl,
    resources: values.resources,
  };
}

export function mapApiLessonToStudio(lesson: LessonDetail): StudioLesson {
  return {
    id: lesson.id,
    moduleId: lesson.moduleId,
    title: lesson.title,
    description: lesson.description ?? '',
    materialsDescription: lesson.materialsDescription ?? '',
    status: lesson.status === 'ARCHIVED' ? 'DRAFT' : lesson.status,
    isPreview: false,
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
      accessMode: (resource.accessMode ?? 'INCLUDED') as StudioLesson['resources'][number]['accessMode'],
    })),
  };
}
