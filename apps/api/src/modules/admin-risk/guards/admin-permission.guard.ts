import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { AuthenticatedUser } from '../../../common/auth';
import { ADMIN_PERMISSIONS_KEY } from '../decorators/require-admin-permissions.decorator';
import { AdminRbacService } from '../admin-rbac.service';
import { isStaffUser } from '../guards/staff.guard';

@Injectable()
export class AdminPermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rbac: AdminRbacService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(
      ADMIN_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
    }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required.');
    }

    const actorId = user.impersonatorId ?? user.id;
    const actorEmail = user.impersonatorEmail ?? user.email;

    const isLegacyStaff = isStaffUser(
      this.configService,
      actorId,
      actorEmail,
    );
    const hasRbacRole = await this.rbac.isAdminUser(actorId);

    if (!isLegacyStaff && !hasRbacRole) {
      throw new ForbiddenException('Admin access required.');
    }

    if (!required || required.length === 0) {
      return true;
    }

    if (isLegacyStaff) {
      return true;
    }

    const allowed = await this.rbac.hasAnyPermission(actorId, required);
    if (!allowed) {
      throw new ForbiddenException(
        `Missing required permission: ${required.join(' or ')}`,
      );
    }

    return true;
  }
}
