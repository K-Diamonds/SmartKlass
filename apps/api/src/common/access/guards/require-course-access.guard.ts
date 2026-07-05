import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { REQUIRE_COURSE_ACCESS_KEY } from '../access.constants';
import { AccessService } from '../access.service';
import { ResolvedCourseAccess } from '../access.types';

@Injectable()
export class RequireCourseAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly accessService: AccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const metadata = this.reflector.get<{ paramKey: string } | undefined>(
      REQUIRE_COURSE_ACCESS_KEY,
      context.getHandler(),
    );

    if (!metadata) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
      courseAccess?: ResolvedCourseAccess;
      params: Record<string, string>;
    }>();

    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Authentication required.');
    }

    const courseId = request.params[metadata.paramKey];

    if (!courseId) {
      throw new ForbiddenException('Course id is required.');
    }

    const access = await this.accessService.resolveCourseAccessForUser(
      user.id,
      courseId,
    );

    if (!access.hasAccess) {
      throw new ForbiddenException('You do not have access to this course.');
    }

    request.courseAccess = access;
    return true;
  }
}
