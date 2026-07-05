import { apiFetch, setAuthTokens, clearAuthTokens } from './client';

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  isCreator: boolean;
  creatorProfileId: string | null;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

export type AuthResponse = {
  user: AuthUser;
  tokens: AuthTokens;
};

/** @deprecated Use clearAuthTokens from ./client */
export function clearAuthToken(): void {
  clearAuthTokens();
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    skipAuthRefresh: true,
  });
  setAuthTokens(response.tokens.accessToken, response.tokens.refreshToken);
  return response;
}

export async function register(
  email: string,
  password: string,
  displayName: string,
): Promise<AuthResponse> {
  const response = await apiFetch<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, displayName }),
    skipAuthRefresh: true,
  });
  setAuthTokens(response.tokens.accessToken, response.tokens.refreshToken);
  return response;
}
