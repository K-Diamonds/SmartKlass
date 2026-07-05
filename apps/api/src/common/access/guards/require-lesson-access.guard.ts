import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { REQUIRE_LESSON_ACCESS_KEY } from '../access.constants';
import { AccessService } from '../access.service';
import { AccessGrantSource } from '../access.types';

@Injectable()
export class RequireLessonAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly accessService: AccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const metadata = this.reflector.get<{ paramKey: string } | undefined>(
      REQUIRE_LESSON_ACCESS_KEY,
      context.getHandler(),
    );

    if (!metadata) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
      lessonAccessSource?: AccessGrantSource | null;
      params: Record<string, string>;
    }>();

    const user = request.user ?? null;

    const lessonId = request.params[metadata.paramKey];

    if (!lessonId) {
      throw new ForbiddenException('Lesson id is required.');
    }

    const canView = await this.accessService.canViewLesson(
      user?.id ?? null,
      lessonId,
    );

    if (!canView) {
      throw new ForbiddenException('You do not have access to this lesson.');
    }

    request.lessonAccessSource =
      await this.accessService.resolveLessonAccessSource(
        user?.id ?? null,
        lessonId,
      );

    return true;
  }
}
