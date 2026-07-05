import { ApiRequestError, type ApiResult } from './types';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? 'http://localhost:4000';

const ACCESS_TOKEN_KEY = 'smartklass_token';
const REFRESH_TOKEN_KEY = 'smartklass_refresh_token';

export function getApiBaseUrl(): string {
  return `${API_BASE}/api/v1`;
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setAuthTokens(accessToken: string, refreshToken: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearAuthTokens(): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

async function parseApiResult<T>(response: Response): Promise<ApiResult<T>> {
  try {
    return (await response.json()) as ApiResult<T>;
  } catch {
    throw new ApiRequestError(
      `Unexpected response from API (${response.status}).`,
      response.status,
    );
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  let response: Response;

  try {
    response = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
    });
  } catch {
    return null;
  }

  const payload = await parseApiResult<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }>(response);

  if (!response.ok || !payload.success) {
    return null;
  }

  setAuthTokens(payload.data.accessToken, payload.data.refreshToken);
  return payload.data.accessToken;
}

type ApiFetchOptions = RequestInit & {
  skipAuthRefresh?: boolean;
};

export async function apiFetch<T>(
  path: string,
  init?: ApiFetchOptions,
  retried = false,
): Promise<T> {
  const { skipAuthRefresh, ...requestInit } = init ?? {};
  const token = getAuthToken();
  const headers = new Headers(requestInit.headers);

  if (!headers.has('Content-Type') && requestInit.body) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;

  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...requestInit,
      headers,
      cache: 'no-store',
    });
  } catch {
    throw new ApiRequestError(
      'Could not reach the API. Make sure the server is running.',
      0,
      'NETWORK_ERROR',
    );
  }

  const payload = await parseApiResult<T>(response);

  if (!response.ok || !payload.success) {
    const message =
      !payload.success && payload.error?.message
        ? payload.error.message
        : 'Request failed.';
    const code =
      !payload.success && payload.error?.code ? payload.error.code : undefined;

    const canRefresh =
      !skipAuthRefresh &&
      !retried &&
      response.status === 401 &&
      !path.startsWith('/auth/login') &&
      !path.startsWith('/auth/register') &&
      !path.startsWith('/auth/refresh');

    if (canRefresh) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        return apiFetch<T>(path, init, true);
      }
      clearAuthTokens();
    }

    throw new ApiRequestError(message, response.status, code);
  }

  return payload.data;
}

export async function apiFetchPaginated<T>(
  path: string,
  init?: ApiFetchOptions,
): Promise<T[]> {
  const data = await apiFetch<T[] | { items: T[] }>(path, init);

  if (Array.isArray(data)) {
    return data;
  }

  if (data && typeof data === 'object' && Array.isArray(data.items)) {
    return data.items;
  }

  return [];
}
