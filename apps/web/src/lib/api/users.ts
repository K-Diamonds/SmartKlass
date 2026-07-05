import { apiFetch, getApiBaseUrl, getAuthToken, clearAuthTokens } from './client';
import { ApiRequestError } from './types';

export type UserProfile = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  timezone: string | null;
  locale: string;
  status: string;
  isCreator: boolean;
  creatorProfileId: string | null;
  creatorCourseCount: number;
  createdAt: string;
};

export type UpdateUserPayload = {
  displayName?: string;
  avatarUrl?: string | null;
  bio?: string;
  timezone?: string;
  locale?: string;
};

export function getMe(): Promise<UserProfile> {
  return apiFetch<UserProfile>('/users/me');
}

export function updateMe(payload: UpdateUserPayload): Promise<UserProfile> {
  return apiFetch<UserProfile>('/users/me', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export type LibraryCourse = {
  courseId: string;
  slug: string;
  title: string;
  thumbnailUrl: string | null;
  accessLabel: string;
  firstLessonId: string | null;
};

export function getMyLibrary(): Promise<LibraryCourse[]> {
  return apiFetch<{ items: LibraryCourse[] }>('/users/me/library').then(
    (result) => result.items,
  );
}

export async function uploadAvatar(file: File): Promise<UserProfile> {
  const token = getAuthToken();
  const formData = new FormData();
  formData.append('file', file);

  const headers = new Headers();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;

  try {
    response = await fetch(`${getApiBaseUrl()}/users/me/avatar`, {
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
    data?: UserProfile;
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

  if (!response.ok || !payload.success || !payload.data) {
    if (response.status === 401) {
      clearAuthTokens();
    }

    throw new ApiRequestError(
      payload.error?.message ?? 'Could not upload profile photo.',
      response.status,
      payload.error?.code,
    );
  }

  return payload.data;
}
