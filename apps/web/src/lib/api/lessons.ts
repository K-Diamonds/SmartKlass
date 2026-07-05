import { apiFetch } from './client';

export type LessonResource = {
  id: string;
  title: string;
  description: string | null;
  resourceType: string;
  url: string;
  purchaseUrl: string | null;
  accessMode: string;
  sortOrder: number;
};

export type LessonDetail = {
  id: string;
  moduleId: string;
  title: string;
  description: string | null;
  materialsDescription: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  sortOrder: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  isPreview: boolean;
  youtubeVideoId: string | null;
  youtubeUrl: string | null;
  resources: LessonResource[];
};

export type CreateLessonInput = {
  title: string;
  description?: string;
  materialsDescription?: string;
  sortOrder?: number;
};

export type UpdateLessonInput = {
  title?: string;
  description?: string;
  materialsDescription?: string;
  sortOrder?: number;
  status?: LessonDetail['status'];
};

export type AddLessonResourceInput = {
  title: string;
  description?: string;
  url?: string;
  purchaseUrl?: string;
  accessMode?: 'INCLUDED' | 'PURCHASE' | 'VIDEO';
  resourceType?: 'PDF' | 'LINK' | 'WORKSHEET' | 'CODE' | 'VIDEO' | 'OTHER';
  sortOrder?: number;
};

export function createLesson(
  moduleId: string,
  input: CreateLessonInput,
): Promise<LessonDetail> {
  return apiFetch<LessonDetail>(`/modules/${moduleId}/lessons`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateLesson(
  lessonId: string,
  input: UpdateLessonInput,
): Promise<LessonDetail> {
  return apiFetch<LessonDetail>(`/lessons/${lessonId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function setLessonYoutube(
  lessonId: string,
  input: { youtubeUrl: string },
): Promise<LessonDetail> {
  return apiFetch<LessonDetail>(`/lessons/${lessonId}/youtube`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function addLessonResource(
  lessonId: string,
  input: AddLessonResourceInput,
): Promise<LessonDetail> {
  return apiFetch<LessonDetail>(`/lessons/${lessonId}/resources`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
