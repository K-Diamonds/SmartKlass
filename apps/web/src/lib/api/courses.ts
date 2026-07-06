import { apiFetch, apiFetchPaginated, getApiBaseUrl, getAuthToken, clearAuthTokens } from './client';
import { ApiRequestError } from './types';

export type CourseDetail = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string;
  thumbnailUrl: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'PENDING_REVIEW';
  estimatedHours: number | null;
  difficultyLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  language: string;
  offersCertificate: boolean;
  trailerYoutubeId: string | null;
  previewMaterialsDescription: string | null;
  publishedAt: string | null;
  moduleCount: number;
  lessonCount: number;
  creator: {
    slug: string;
    displayName: string;
  };
};

export type CreateCourseInput = {
  title: string;
  subtitle?: string;
  description: string;
  thumbnailUrl?: string;
  language?: string;
};

export function createCourse(input: CreateCourseInput): Promise<CourseDetail> {
  return apiFetch<CourseDetail>('/courses', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export type UpdateCourseInput = {
  title?: string;
  subtitle?: string;
  description?: string;
  thumbnailUrl?: string;
  trailerYoutubeId?: string | null;
  previewMaterialsDescription?: string | null;
  estimatedHours?: number | null;
  difficultyLevel?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  language?: string;
  status?: CourseDetail['status'];
};

export function updateCourse(
  courseId: string,
  input: UpdateCourseInput,
): Promise<CourseDetail> {
  return apiFetch<CourseDetail>(`/courses/${courseId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function publishCourse(courseId: string): Promise<CourseDetail> {
  return apiFetch<CourseDetail>(`/courses/${courseId}/publish`, {
    method: 'POST',
  });
}

export function archiveCourse(courseId: string): Promise<CourseDetail> {
  return apiFetch<CourseDetail>(`/courses/${courseId}/archive`, {
    method: 'POST',
  });
}

export type CreatorCourseListItem = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  thumbnailUrl: string | null;
  status: CourseDetail['status'];
  moduleCount: number;
  lessonCount: number;
};

export async function listMyCourses(): Promise<CreatorCourseListItem[]> {
  return apiFetchPaginated<CreatorCourseListItem>('/courses/mine?limit=100');
}

export type CourseSummary = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  thumbnailUrl: string | null;
  status: CourseDetail['status'];
  estimatedHours: number | null;
  difficultyLevel: CourseDetail['difficultyLevel'];
  language: string;
  offersCertificate: boolean;
  creator: {
    slug: string;
    displayName: string;
  };
};

export type ListCoursesParams = {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  creator?: string;
  language?: string;
  certificates?: boolean;
};

export type PaginatedCourses<T> = {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

function buildCoursesQuery(params: ListCoursesParams): string {
  const search = new URLSearchParams();
  if (params.page) search.set('page', String(params.page));
  if (params.limit) search.set('limit', String(params.limit));
  if (params.search) search.set('search', params.search);
  if (params.category) search.set('category', params.category);
  if (params.creator) search.set('creator', params.creator);
  if (params.language) search.set('language', params.language);
  if (params.certificates) search.set('certificates', 'true');
  return search.toString();
}

export function listPublishedCourses(
  params: ListCoursesParams = {},
): Promise<PaginatedCourses<CourseSummary>> {
  const query = buildCoursesQuery({ limit: 24, ...params });
  return apiFetch<PaginatedCourses<CourseSummary>>(`/courses?${query}`);
}

export function getPublishedCourseById(courseId: string): Promise<CourseDetail> {
  return apiFetch<CourseDetail>(`/courses/by-id/${courseId}`);
}

export function getPublishedCourseBySlug(slug: string): Promise<CourseDetail> {
  return apiFetch<CourseDetail>(`/courses/${slug}`);
}

export type CreatorCourseStudio = import('@/lib/studio/map-course').CreatorCourseStudio;

export function getMyCourseStudio(courseId: string): Promise<CreatorCourseStudio> {
  return apiFetch<CreatorCourseStudio>(`/courses/mine/${courseId}`);
}

export async function uploadCourseThumbnail(file: File): Promise<string> {
  const token = getAuthToken();
  const formData = new FormData();
  formData.append('file', file);

  const headers = new Headers();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;

  try {
    response = await fetch(`${getApiBaseUrl()}/courses/thumbnail`, {
      method: 'POST',
      headers,
      body: formData,
      cache: 'no-store',
    });
  } catch {
    throw new ApiRequestError(
      'Could not reach the API. Make sure the server is running.',
      0,
      'NETWORK_ERROR',
    );
  }

  let payload: {
    success: boolean;
    data?: { thumbnailUrl: string };
    error?: { message: string; code?: string };
  };

  try {
    payload = await response.json();
  } catch {
    throw new ApiRequestError(
      `Unexpected response from API (${response.status}).`,
      response.status,
    );
  }

  if (!response.ok || !payload.success || !payload.data?.thumbnailUrl) {
    if (response.status === 401) {
      clearAuthTokens();
    }

    throw new ApiRequestError(
      payload.error?.message ?? 'Could not upload course thumbnail.',
      response.status,
      payload.error?.code,
    );
  }

  return payload.data.thumbnailUrl;
}
