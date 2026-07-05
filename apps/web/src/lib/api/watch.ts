import { apiFetch } from './client';

export type LessonWatchYoutube = {
  videoId: string;
  embedUrl: string;
  watchUrl: string;
  thumbnailUrl: string | null;
  provider: string;
};

export type LessonWatchResource = {
  id: string;
  title: string;
  resourceType: string;
  url: string;
  sortOrder: number;
};

export type LessonWatchData = {
  id: string;
  moduleId: string;
  courseId: string;
  title: string;
  description: string | null;
  sortOrder: number;
  durationSeconds: number | null;
  isPreview: boolean;
  youtube: LessonWatchYoutube | null;
  resources: LessonWatchResource[];
};

export type CourseAccessData = {
  courseId: string;
  hasAccess: boolean;
  canWatch: boolean;
  source: string | null;
  isOwner: boolean;
  hasActiveSubscription: boolean;
  accessPlan: {
    id: string;
    name: string;
    planType: string;
    billingInterval: string | null;
  } | null;
  expiresAt: string | null;
};

export type CourseWatchData = {
  course: {
    id: string;
    slug: string;
    title: string;
    subtitle: string | null;
    description: string;
    thumbnailUrl: string | null;
  };
  access: CourseAccessData;
  modules: Array<{
    id: string;
    title: string;
    description: string | null;
    sortOrder: number;
    lessons: LessonWatchData[];
  }>;
};

/** Fetch lesson watch payload — YouTube embed metadata only when access is granted. */
export function fetchLessonWatch(lessonId: string): Promise<LessonWatchData> {
  return apiFetch<LessonWatchData>(`/lessons/${lessonId}/watch`);
}

/** Fetch full course curriculum for the learning sidebar — requires course access. */
export function fetchCourseWatch(courseId: string): Promise<CourseWatchData> {
  return apiFetch<CourseWatchData>(`/courses/${courseId}/watch`);
}
