import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { AccessGrantSource } from './access.types';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AccessService } from './access.service';
import { RequireCourseAccessGuard } from './guards/require-course-access.guard';
import { RequireLessonAccessGuard } from './guards/require-lesson-access.guard';
import { CourseOwnerGuard } from './guards/course-owner.guard';
import {
  COURSE_OWNER_KEY,
  REQUIRE_COURSE_ACCESS_KEY,
  REQUIRE_LESSON_ACCESS_KEY,
} from './access.constants';

describe('Access guards', () => {
  let courseAccessGuard: RequireCourseAccessGuard;
  let lessonAccessGuard: RequireLessonAccessGuard;
  let courseOwnerGuard: CourseOwnerGuard;
  let reflector: Reflector;

  const accessServiceMock = {
    resolveCourseAccessForUser: jest.fn(),
    canViewLesson: jest.fn(),
    resolveLessonAccessSource: jest.fn(),
    isCourseOwner: jest.fn(),
  };

  const createContext = (request: Record<string, unknown>): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    }) as ExecutionContext;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequireCourseAccessGuard,
        RequireLessonAccessGuard,
        CourseOwnerGuard,
        Reflector,
        { provide: AccessService, useValue: accessServiceMock },
      ],
    }).compile();

    courseAccessGuard = module.get(RequireCourseAccessGuard);
    lessonAccessGuard = module.get(RequireLessonAccessGuard);
    courseOwnerGuard = module.get(CourseOwnerGuard);
    reflector = module.get(Reflector);
  });

  it('RequireCourseAccessGuard allows users with course access', async () => {
    jest.spyOn(reflector, 'get').mockImplementation((key) => {
      if (key === REQUIRE_COURSE_ACCESS_KEY) {
        return { paramKey: 'id' };
      }

      return undefined;
    });
    accessServiceMock.resolveCourseAccessForUser.mockResolvedValue({
      hasAccess: true,
      source: AccessGrantSource.LIFETIME_PURCHASE,
    });

    const request = {
      user: { id: 'user_1' },
      params: { id: 'course_1' },
    };

    await expect(
      courseAccessGuard.canActivate(createContext(request)),
    ).resolves.toBe(true);
    expect(request).toHaveProperty('courseAccess');
  });

  it('RequireCourseAccessGuard blocks users without course access', async () => {
    jest.spyOn(reflector, 'get').mockImplementation((key) => {
      if (key === REQUIRE_COURSE_ACCESS_KEY) {
        return { paramKey: 'id' };
      }

      return undefined;
    });
    accessServiceMock.resolveCourseAccessForUser.mockResolvedValue({
      hasAccess: false,
      source: null,
    });

    await expect(
      courseAccessGuard.canActivate(
        createContext({
          user: { id: 'user_1' },
          params: { id: 'course_1' },
        }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('RequireLessonAccessGuard allows purchased lesson access', async () => {
    jest.spyOn(reflector, 'get').mockImplementation((key) => {
      if (key === REQUIRE_LESSON_ACCESS_KEY) {
        return { paramKey: 'id' };
      }

      return undefined;
    });
    accessServiceMock.canViewLesson.mockResolvedValue(true);
    accessServiceMock.resolveLessonAccessSource.mockResolvedValue(
      AccessGrantSource.SUBSCRIPTION,
    );

    const request: {
      user: Pick<AuthenticatedUser, 'id'>;
      params: { id: string };
      lessonAccessSource?: AccessGrantSource | null;
    } = {
      user: { id: 'user_1' },
      params: { id: 'lesson_1' },
    };

    await expect(
      lessonAccessGuard.canActivate(createContext(request)),
    ).resolves.toBe(true);
    expect(request.lessonAccessSource).toBe(AccessGrantSource.SUBSCRIPTION);
  });

  it('CourseOwnerGuard allows only the course creator', async () => {
    jest.spyOn(reflector, 'get').mockImplementation((key) => {
      if (key === COURSE_OWNER_KEY) {
        return { paramKey: 'id' };
      }

      return undefined;
    });
    accessServiceMock.isCourseOwner.mockResolvedValue(true);

    await expect(
      courseOwnerGuard.canActivate(
        createContext({
          user: { id: 'creator_user' },
          params: { id: 'course_1' },
        }),
      ),
    ).resolves.toBe(true);
  });

  it('CourseOwnerGuard blocks non-owners', async () => {
    jest.spyOn(reflector, 'get').mockImplementation((key) => {
      if (key === COURSE_OWNER_KEY) {
        return { paramKey: 'id' };
      }

      return undefined;
    });
    accessServiceMock.isCourseOwner.mockResolvedValue(false);

    await expect(
      courseOwnerGuard.canActivate(
        createContext({
          user: { id: 'user_1' },
          params: { id: 'course_1' },
        }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });
});
