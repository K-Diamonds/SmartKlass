import { apiFetch } from './client';

export type CreatorProfile = {
  id: string;
  userId: string;
  slug: string;
  displayName: string;
  headline: string | null;
  bio: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
};

export type BecomeCreatorInput = {
  slug: string;
  displayName: string;
  headline?: string;
  bio?: string;
};

export type UpdateCreatorProfileInput = {
  slug?: string;
  displayName?: string;
  headline?: string;
  bio?: string;
};

export function becomeCreator(input: BecomeCreatorInput): Promise<CreatorProfile> {
  return apiFetch<CreatorProfile>('/creators/become-creator', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function getMyCreatorProfile(): Promise<CreatorProfile> {
  return apiFetch<CreatorProfile>('/creators/profile');
}

export function updateMyCreatorProfile(
  input: UpdateCreatorProfileInput,
): Promise<CreatorProfile> {
  return apiFetch<CreatorProfile>('/creators/profile', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}
