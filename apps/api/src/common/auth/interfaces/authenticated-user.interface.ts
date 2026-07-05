import { UserStatus } from '@smartklass/database';

export interface AuthenticatedUser {
  id: string;
  email: string;
  status: UserStatus;
  creatorProfileId: string | null;
  impersonatorId?: string;
  impersonatorEmail?: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  type: 'access' | 'refresh';
  impersonatorId?: string;
  impersonatorEmail?: string;
}
