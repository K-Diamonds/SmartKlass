import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { COURSE_OWNER_KEY } from '../access.constants';
import { AccessService } from '../access.service';

@Injectable()
export class CourseOwnerGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly accessService: AccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const metadata = this.reflector.get<{ paramKey: string } | undefined>(
      COURSE_OWNER_KEY,
      context.getHandler(),
    );

    if (!metadata) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
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

    const isOwner = await this.accessService.isCourseOwner(user.id, courseId);

    if (!isOwner) {
      throw new ForbiddenException(
        'Only the course owner can perform this action.',
      );
    }

    return true;
  }
}
