import { apiFetch } from './client';

export type CourseModule = {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  sortOrder: number;
  lessonCount: number;
  createdAt: string;
};

export type CreateCourseModuleInput = {
  title: string;
  description?: string;
  sortOrder?: number;
};

export type UpdateCourseModuleInput = {
  title?: string;
  description?: string;
  sortOrder?: number;
};

export function createCourseModule(
  courseId: string,
  input: CreateCourseModuleInput,
): Promise<CourseModule> {
  return apiFetch<CourseModule>(`/courses/${courseId}/modules`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateCourseModule(
  moduleId: string,
  input: UpdateCourseModuleInput,
): Promise<CourseModule> {
  return apiFetch<CourseModule>(`/modules/${moduleId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}
