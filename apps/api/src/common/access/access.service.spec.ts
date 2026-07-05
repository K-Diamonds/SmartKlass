import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  AccessPlanType,
  BillingInterval,
  CourseStatus,
  LessonStatus,
  SubscriptionStatus,
} from '@smartklass/database';
import { PrismaService } from '../database/prisma.service';
import { AccessService } from './access.service';
import { AccessGrantSource } from './access.types';

describe('AccessService', () => {
  let service: AccessService;

  const now = new Date('2026-07-04T12:00:00.000Z');

  const publishedCourse = {
    id: 'course_1',
    slug: 'pasta-basics',
    title: 'Pasta Basics',
    subtitle: null,
    description: 'Learn pasta',
    thumbnailUrl: null,
    status: CourseStatus.PUBLISHED,
    creatorProfileId: 'creator_profile_1',
  };

  const prismaMock = {
    course: {
      findFirst: jest.fn(),
    },
    courseModule: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    lesson: {
      findFirst: jest.fn(),
    },
    courseAccess: {
      findMany: jest.fn(),
    },
    userSubscription: {
      findFirst: jest.fn(),
    },
    accessPlan: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(now);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccessService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<AccessService>(AccessService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function mockPublishedCourse() {
    prismaMock.course.findFirst.mockResolvedValue(publishedCourse);
  }

  function mockNoGrants() {
    prismaMock.courseAccess.findMany.mockResolvedValue([]);
  }

  function mockNotOwner() {
    prismaMock.course.findFirst.mockImplementation(
      (args: {
        where: { id?: string };
        select?: { creatorProfile?: unknown };
      }) => {
        if (args.select?.creatorProfile) {
          return Promise.resolve({
            creatorProfile: {
              userId: 'other_user',
              deletedAt: null,
            },
          });
        }

        if (args.where.id) {
          return Promise.resolve(publishedCourse);
        }

        return Promise.resolve(null);
      },
    );
  }

  function mockOwner(userId = 'owner_user') {
    prismaMock.course.findFirst.mockImplementation(
      (args: {
        where: { id?: string };
        select?: { creatorProfile?: unknown };
      }) => {
        if (args.select?.creatorProfile) {
          return Promise.resolve({
            creatorProfile: {
              userId,
              deletedAt: null,
            },
          });
        }

        if (args.where.id) {
          return Promise.resolve(publishedCourse);
        }

        return Promise.resolve(null);
      },
    );
  }

  it('denies access when the user has no grants', async () => {
    mockPublishedCourse();
    mockNotOwner();
    mockNoGrants();

    const access = await service.resolveCourseAccessForUser(
      'user_1',
      'course_1',
    );

    expect(access.hasAccess).toBe(false);
    expect(access.source).toBeNull();
    expect(await service.canViewCourse('user_1', 'course_1')).toBe(false);
  });

  it('grants access through a free plan', async () => {
    mockPublishedCourse();
    mockNotOwner();
    prismaMock.courseAccess.findMany.mockResolvedValue([
      {
        id: 'grant_1',
        expiresAt: null,
        accessPlan: {
          id: 'plan_free',
          name: 'Free Access',
          planType: AccessPlanType.FREE,
          billingInterval: null,
          deletedAt: null,
          isActive: true,
        },
        userSubscriptionId: null,
        userSubscription: null,
      },
    ]);

    const access = await service.resolveCourseAccessForUser(
      'user_1',
      'course_1',
    );

    expect(access.hasAccess).toBe(true);
    expect(access.source).toBe(AccessGrantSource.FREE_PLAN);
    expect(access.accessPlanId).toBe('plan_free');
    expect(await service.canViewCourse('user_1', 'course_1')).toBe(true);
  });

  it('grants access through a lifetime purchase', async () => {
    mockPublishedCourse();
    mockNotOwner();
    prismaMock.courseAccess.findMany.mockResolvedValue([
      {
        id: 'grant_2',
        expiresAt: null,
        accessPlan: {
          id: 'plan_lifetime',
          name: 'Lifetime Access',
          planType: AccessPlanType.ONE_TIME,
          billingInterval: null,
          deletedAt: null,
          isActive: true,
        },
        userSubscriptionId: null,
        userSubscription: null,
      },
    ]);

    const access = await service.resolveCourseAccessForUser(
      'user_1',
      'course_1',
    );

    expect(access.hasAccess).toBe(true);
    expect(access.source).toBe(AccessGrantSource.LIFETIME_PURCHASE);
    expect(access.accessPlanName).toBe('Lifetime Access');
  });

  it('grants access through an active monthly subscription', async () => {
    mockPublishedCourse();
    mockNotOwner();
    prismaMock.courseAccess.findMany.mockResolvedValue([
      {
        id: 'grant_3',
        expiresAt: new Date('2026-08-04T12:00:00.000Z'),
        accessPlan: {
          id: 'plan_monthly',
          name: 'Monthly Membership',
          planType: AccessPlanType.SUBSCRIPTION,
          billingInterval: BillingInterval.MONTHLY,
          deletedAt: null,
          isActive: true,
        },
        userSubscriptionId: 'sub_1',
        userSubscription: {
          id: 'sub_1',
          deletedAt: null,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodEnd: new Date('2026-08-04T12:00:00.000Z'),
        },
      },
    ]);
    prismaMock.userSubscription.findFirst.mockResolvedValue({
      id: 'sub_1',
      status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: new Date('2026-08-04T12:00:00.000Z'),
    });

    const access = await service.resolveCourseAccessForUser(
      'user_1',
      'course_1',
    );

    expect(access.hasAccess).toBe(true);
    expect(access.source).toBe(AccessGrantSource.SUBSCRIPTION_MONTHLY);
    expect(await service.hasActiveSubscription('user_1', 'course_1')).toBe(
      true,
    );
  });

  it('denies access when the subscription is expired', async () => {
    mockPublishedCourse();
    mockNotOwner();
    prismaMock.courseAccess.findMany.mockResolvedValue([
      {
        id: 'grant_4',
        expiresAt: new Date('2026-06-01T12:00:00.000Z'),
        accessPlan: {
          id: 'plan_monthly',
          name: 'Monthly Membership',
          planType: AccessPlanType.SUBSCRIPTION,
          billingInterval: BillingInterval.MONTHLY,
          deletedAt: null,
          isActive: true,
        },
        userSubscriptionId: 'sub_expired',
        userSubscription: {
          id: 'sub_expired',
          deletedAt: null,
          status: SubscriptionStatus.CANCELED,
          currentPeriodEnd: new Date('2026-06-01T12:00:00.000Z'),
        },
      },
    ]);
    prismaMock.userSubscription.findFirst.mockResolvedValue(null);

    const access = await service.resolveCourseAccessForUser(
      'user_1',
      'course_1',
    );

    expect(access.hasAccess).toBe(false);
    expect(await service.hasActiveSubscription('user_1', 'course_1')).toBe(
      false,
    );
  });

  it('grants creator owner access without a purchase', async () => {
    mockOwner('creator_user');
    mockNoGrants();

    const access = await service.resolveCourseAccessForUser(
      'creator_user',
      'course_1',
    );

    expect(access.hasAccess).toBe(true);
    expect(access.source).toBe(AccessGrantSource.CREATOR_OWNER);
    expect(access.isOwner).toBe(true);
    expect(access.accessPlanId).toBeNull();
    expect(await service.isCourseOwner('creator_user', 'course_1')).toBe(true);
  });

  it('returns access status for the access endpoint', async () => {
    mockPublishedCourse();
    mockNotOwner();
    prismaMock.courseAccess.findMany.mockResolvedValue([
      {
        id: 'grant_5',
        expiresAt: null,
        accessPlan: {
          id: 'plan_free',
          name: 'Free Access',
          planType: AccessPlanType.FREE,
          billingInterval: null,
          deletedAt: null,
          isActive: true,
        },
        userSubscriptionId: null,
        userSubscription: null,
      },
    ]);
    prismaMock.userSubscription.findFirst.mockResolvedValue(null);

    const status = await service.getCourseAccessStatus('user_1', 'course_1');

    expect(status).toMatchObject({
      courseId: 'course_1',
      hasAccess: true,
      canWatch: true,
      source: AccessGrantSource.FREE_PLAN,
      hasActiveSubscription: false,
      isOwner: false,
    });
    expect(status.accessPlan?.id).toBe('plan_free');
  });

  it('denies lesson access without a course grant', async () => {
    prismaMock.lesson.findFirst.mockResolvedValue({
      id: 'lesson_preview',
      moduleId: 'module_1',
      title: 'Preview Lesson',
      description: null,
      sortOrder: 0,
      durationSeconds: 120,
      isPreview: true,
      status: LessonStatus.PUBLISHED,
      youtubeVideoId: 'abc123',
      youtubeUrl: 'https://www.youtube.com/watch?v=abc123',
      thumbnailUrl: 'https://img.youtube.com/vi/abc123/hqdefault.jpg',
      provider: 'YOUTUBE',
      resources: [],
      module: {
        course: publishedCourse,
      },
    });
    mockPublishedCourse();
    mockNotOwner();
    mockNoGrants();

    expect(await service.canViewLesson('user_1', 'lesson_preview')).toBe(false);
    expect(
      await service.resolveLessonAccessSource('user_1', 'lesson_preview'),
    ).toBe(null);
  });

  it('returns lesson watch data with youtube metadata when access is granted', async () => {
    prismaMock.lesson.findFirst.mockResolvedValue({
      id: 'lesson_1',
      moduleId: 'module_1',
      title: 'Lesson One',
      description: 'Intro',
      sortOrder: 0,
      durationSeconds: 300,
      isPreview: false,
      status: LessonStatus.PUBLISHED,
      youtubeVideoId: 'xyz789',
      youtubeUrl: 'https://www.youtube.com/watch?v=xyz789',
      thumbnailUrl: 'https://img.youtube.com/vi/xyz789/hqdefault.jpg',
      provider: 'YOUTUBE',
      resources: [],
      module: {
        course: publishedCourse,
      },
    });
    mockPublishedCourse();
    mockNotOwner();
    prismaMock.courseAccess.findMany.mockResolvedValue([
      {
        id: 'grant_6',
        expiresAt: null,
        accessPlan: {
          id: 'plan_lifetime',
          name: 'Lifetime Access',
          planType: AccessPlanType.ONE_TIME,
          billingInterval: null,
          deletedAt: null,
          isActive: true,
        },
        userSubscriptionId: null,
        userSubscription: null,
      },
    ]);

    const watch = await service.getLessonWatch('user_1', 'lesson_1');

    expect(watch.youtube).toEqual({
      videoId: 'xyz789',
      embedUrl: 'https://www.youtube.com/embed/xyz789',
      watchUrl: 'https://www.youtube.com/watch?v=xyz789',
      thumbnailUrl: 'https://img.youtube.com/vi/xyz789/hqdefault.jpg',
      provider: 'YOUTUBE',
    });
  });

  it('throws when requesting course watch without access', async () => {
    mockPublishedCourse();
    mockNotOwner();
    mockNoGrants();

    await expect(service.getCourseWatch('user_1', 'course_1')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('throws when the course is not published and the user has no grant', async () => {
    prismaMock.course.findFirst.mockImplementation(
      (args: {
        where: { id?: string; status?: CourseStatus };
        select?: { creatorProfile?: unknown };
      }) => {
        if (args.select?.creatorProfile) {
          return Promise.resolve({
            creatorProfile: {
              userId: 'other_user',
              deletedAt: null,
            },
          });
        }

        if (args.where.id) {
          return Promise.resolve({
            ...publishedCourse,
            status: CourseStatus.DRAFT,
          });
        }

        return Promise.resolve(null);
      },
    );
    mockNoGrants();

    await expect(
      service.resolveCourseAccessForUser('user_1', 'course_1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('grants access to unpublished courses through an active grant', async () => {
    prismaMock.course.findFirst.mockImplementation(
      (args: {
        where: { id?: string; status?: CourseStatus };
        select?: { creatorProfile?: unknown };
      }) => {
        if (args.select?.creatorProfile) {
          return Promise.resolve({
            creatorProfile: {
              userId: 'other_user',
              deletedAt: null,
            },
          });
        }

        if (args.where.id) {
          return Promise.resolve({
            ...publishedCourse,
            status: CourseStatus.DRAFT,
          });
        }

        return Promise.resolve(null);
      },
    );
    prismaMock.courseAccess.findMany.mockResolvedValue([
      {
        id: 'grant_draft',
        expiresAt: null,
        accessPlan: {
          id: 'plan_monthly',
          name: 'Monthly Membership',
          planType: AccessPlanType.SUBSCRIPTION,
          billingInterval: BillingInterval.MONTHLY,
          deletedAt: null,
          isActive: true,
        },
        userSubscriptionId: 'sub_1',
        userSubscription: {
          deletedAt: null,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodEnd: new Date('2026-08-04T12:00:00.000Z'),
        },
      },
    ]);

    const access = await service.resolveCourseAccessForUser(
      'user_1',
      'course_1',
    );

    expect(access.hasAccess).toBe(true);
    expect(access.source).toBe(AccessGrantSource.SUBSCRIPTION_MONTHLY);
    expect(await service.canViewCourse('user_1', 'course_1')).toBe(true);
  });

  it('requires owner subscribe on draft courses before access', async () => {
    prismaMock.course.findFirst.mockImplementation(
      (args: {
        where: { id?: string; status?: CourseStatus };
        select?: { creatorProfile?: unknown };
      }) => {
        if (args.select?.creatorProfile) {
          return Promise.resolve({
            creatorProfile: {
              userId: 'creator_user',
              deletedAt: null,
            },
          });
        }

        if (args.where.id) {
          return Promise.resolve({
            ...publishedCourse,
            status: CourseStatus.DRAFT,
          });
        }

        return Promise.resolve(null);
      },
    );
    mockNoGrants();

    await expect(
      service.resolveCourseAccessForUser('creator_user', 'course_1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('can view module when course access is granted', async () => {
    prismaMock.courseModule.findFirst.mockResolvedValue({
      courseId: 'course_1',
    });
    mockPublishedCourse();
    mockNotOwner();
    prismaMock.courseAccess.findMany.mockResolvedValue([
      {
        id: 'grant_7',
        expiresAt: null,
        accessPlan: {
          id: 'plan_free',
          name: 'Free Access',
          planType: AccessPlanType.FREE,
          billingInterval: null,
          deletedAt: null,
          isActive: true,
        },
        userSubscriptionId: null,
        userSubscription: null,
      },
    ]);

    expect(await service.canViewModule('user_1', 'module_1')).toBe(true);
  });
});
