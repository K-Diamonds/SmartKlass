import {
  addLessonResource,
  createLesson,
  setLessonYoutube,
  updateLesson,
} from '@/lib/api/lessons';
import { createCourseModule } from '@/lib/api/modules';
import { getAuthToken } from '@/lib/api/client';
import { isLocalStudioId } from '@/lib/studio/id-utils';
import { mapApiLessonToStudio } from '@/lib/studio/lesson-utils';
import { toApiResourceType } from '@/lib/studio/resource-providers';
import type { StudioLesson, StudioModule } from '@/lib/studio/types';

export async function ensureModulePersisted(
  courseId: string,
  module: StudioModule,
): Promise<StudioModule> {
  if (!getAuthToken() || isLocalStudioId(courseId) || !isLocalStudioId(module.id)) {
    return module;
  }

  const created = await createCourseModule(courseId, {
    title: module.title.trim() || 'Untitled module',
    description: module.description.trim() || undefined,
    sortOrder: module.sortOrder,
  });

  return {
    ...module,
    id: created.id,
    courseId: created.courseId,
  };
}

export async function persistNewLessonToApi(lesson: StudioLesson): Promise<StudioLesson> {
  if (!getAuthToken() || isLocalStudioId(lesson.moduleId)) {
    return lesson;
  }

  let detail = await createLesson(lesson.moduleId, {
    title: lesson.title,
    description: lesson.description || undefined,
    materialsDescription: lesson.materialsDescription || undefined,
    sortOrder: lesson.sortOrder,
  });

  if (lesson.status !== 'DRAFT') {
    detail = await updateLesson(detail.id, { status: lesson.status });
  }

  let persisted = mapApiLessonToStudio(detail);

  if (lesson.youtubeUrl?.trim() && lesson.youtubeVideoId) {
    detail = await setLessonYoutube(persisted.id, {
      youtubeUrl: lesson.youtubeUrl.trim(),
    });
    persisted = mapApiLessonToStudio(detail);
  }

  for (const resource of lesson.resources) {
    detail = await addLessonResource(persisted.id, {
      title: resource.title,
      description: resource.description || undefined,
      url: resource.url || undefined,
      purchaseUrl: resource.purchaseUrl || undefined,
      accessMode: resource.accessMode,
      resourceType: toApiResourceType(resource.resourceType, resource.accessMode),
    });
    persisted = mapApiLessonToStudio(detail);
  }

  return persisted;
}
