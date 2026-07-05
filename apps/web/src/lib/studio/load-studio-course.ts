import { getMyCourseStudio } from '@/lib/api/courses';
import { getAuthToken } from '@/lib/api/client';
import { getStudioCourse } from '@/lib/studio/mock-data';
import { apiCourseToStudioCourse } from '@/lib/studio/map-course';
import { loadStudioCourse, saveStudioCourse } from '@/lib/studio/session-course';
import type { StudioCourse } from '@/lib/studio/types';

export async function loadStudioCourseWithFallback(
  courseId: string,
): Promise<StudioCourse | null> {
  const storedCourse = loadStudioCourse(courseId);

  const loadFromApi = async (): Promise<StudioCourse | null> => {
    try {
      const apiCourse = await getMyCourseStudio(courseId);
      const studioCourse = apiCourseToStudioCourse(apiCourse);
      saveStudioCourse(studioCourse);
      return studioCourse;
    } catch {
      return null;
    }
  };

  if (typeof window !== 'undefined' && getAuthToken()) {
    const apiCourse = await loadFromApi();
    if (apiCourse) {
      return apiCourse;
    }

    return storedCourse;
  }

  const mockCourse = getStudioCourse(courseId);
  if (mockCourse) {
    return mockCourse;
  }

  if (storedCourse) {
    return storedCourse;
  }

  return loadFromApi();
}
