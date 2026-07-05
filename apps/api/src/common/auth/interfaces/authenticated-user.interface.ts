import { UserStatus } from '@smartklass/database';

export interface AuthenticatedUser {
  id: string;
  email: string;
  status: UserStatus;
  creatorProfileId: string | null;
}

export interface JwtPayload {
  sub: string;
  email: string;
  type: 'access' | 'refresh';
}
