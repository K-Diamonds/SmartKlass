import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthenticatedUser } from '../../../common/auth';

@Injectable()
export class StaffGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
    }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required.');
    }

    const actorId = user.impersonatorId ?? user.id;
    const actorEmail = (user.impersonatorEmail ?? user.email).toLowerCase();
    const staffUserIds =
      this.configService.get<string[]>('staff.userIds') ?? [];
    const staffEmails = this.configService.get<string[]>('staff.emails') ?? [];

    const isStaff =
      staffUserIds.includes(actorId) || staffEmails.includes(actorEmail);

    if (!isStaff) {
      throw new ForbiddenException('Staff access required.');
    }

    return true;
  }
}

export function isStaffUser(
  configService: ConfigService,
  userId: string,
  email: string,
): boolean {
  const staffUserIds = configService.get<string[]>('staff.userIds') ?? [];
  const staffEmails = configService.get<string[]>('staff.emails') ?? [];
  return (
    staffUserIds.includes(userId) || staffEmails.includes(email.toLowerCase())
  );
}
