import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AccessPlanType,
  BillingInterval,
  CourseStatus,
  LessonStatus,
  SubscriptionStatus,
} from '@smartklass/database';
import { Prisma } from '@smartklass/database';
import { PrismaService } from '../database/prisma.service';
import {
  AccessGrantSource,
  CourseAccessStatusDto,
  CourseWatchDto,
  LessonWatchDto,
  ResolvedCourseAccess,
} from './access.types';

const ACTIVE_SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.TRIALING,
];

@Injectable()
export class AccessService {
  constructor(private readonly prisma: PrismaService) {}

  async getCourseAccessStatus(
    userId: string,
    courseId: string,
  ): Promise<CourseAccessStatusDto> {
    const course = await this.getCourseForUserAccess(userId, courseId);
    const access = await this.resolveCourseAccess(userId, course);
    const hasActiveSubscription = await this.hasActiveSubscription(
      userId,
      courseId,
    );

    return this.toAccessStatusDto(course.id, access, hasActiveSubscription);
  }

  async canViewCourse(userId: string, courseId: string): Promise<boolean> {
    try {
      const course = await this.getCourseForUserAccess(userId, courseId);
      const access = await this.resolveCourseAccess(userId, course);
      return access.hasAccess;
    } catch (error) {
      if (error instanceof NotFoundException) {
        return false;
      }

      throw error;
    }
  }

  async canViewModule(userId: string, moduleId: string): Promise<boolean> {
    const courseModule = await this.prisma.courseModule.findFirst({
      where: {
        id: moduleId,
        deletedAt: null,
        course: {
          deletedAt: null,
        },
      },
      select: { courseId: true },
    });

    if (!courseModule) {
      return false;
    }

    return this.canViewCourse(userId, courseModule.courseId);
  }

  async canViewLesson(
    userId: string | null,
    lessonId: string,
  ): Promise<boolean> {
    if (!userId) {
      return false;
    }

    try {
      const lesson = await this.getLessonContextForUser(userId, lessonId);
      const access = await this.resolveCourseAccess(
        userId,
        lesson.module.course,
      );

      return access.hasAccess;
    } catch (error) {
      if (error instanceof NotFoundException) {
        return false;
      }

      throw error;
    }
  }

  async resolveCourseAccessForUser(
    userId: string,
    courseId: string,
  ): Promise<ResolvedCourseAccess> {
    const course = await this.getCourseForUserAccess(userId, courseId);
    return this.resolveCourseAccess(userId, course);
  }

  async resolveLessonAccessSource(
    userId: string | null,
    lessonId: string,
  ): Promise<AccessGrantSource | null> {
    if (!userId) {
      return null;
    }

    try {
      const lesson = await this.getLessonContextForUser(userId, lessonId);
      const access = await this.resolveCourseAccess(
        userId,
        lesson.module.course,
      );

      if (access.hasAccess) {
        return access.source;
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        return null;
      }

      throw error;
    }

    return null;
  }

  async getUnlockingPlan(userId: string, courseId: string) {
    const access = await this.resolveCourseAccessForUser(userId, courseId);

    if (!access.accessPlanId) {
      return null;
    }

    return this.prisma.accessPlan.findFirst({
      where: {
        id: access.accessPlanId,
        deletedAt: null,
      },
      include: {
        features: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }

  async hasActiveSubscription(
    userId: string,
    courseId: string,
  ): Promise<boolean> {
    const now = new Date();

    const subscription = await this.prisma.userSubscription.findFirst({
      where: {
        userId,
        deletedAt: null,
        status: { in: ACTIVE_SUBSCRIPTION_STATUSES },
        currentPeriodEnd: { gt: now },
        accessPlan: {
          courseId,
          deletedAt: null,
          planType: AccessPlanType.SUBSCRIPTION,
        },
      },
    });

    return Boolean(subscription);
  }

  async getCourseWatch(
    userId: string,
    courseId: string,
  ): Promise<CourseWatchDto> {
    const course = await this.getCourseForUserAccess(userId, courseId);
    const access = await this.resolveCourseAccess(userId, course);

    if (!access.hasAccess) {
      throw new ForbiddenException(
        'You do not have access to watch this course.',
      );
    }

    const hasActiveSubscription = await this.hasActiveSubscription(
      userId,
      courseId,
    );

    const lessonStatusFilter =
      course.status === CourseStatus.PUBLISHED
        ? { status: LessonStatus.PUBLISHED }
        : {};

    const modules = await this.prisma.courseModule.findMany({
      where: {
        courseId,
        deletedAt: null,
      },
      orderBy: { sortOrder: 'asc' },
      include: {
        lessons: {
          where: {
            deletedAt: null,
            ...lessonStatusFilter,
          },
          orderBy: { sortOrder: 'asc' },
          include: {
            resources: {
              where: { deletedAt: null },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });

    return {
      course: {
        id: course.id,
        slug: course.slug,
        title: course.title,
        subtitle: course.subtitle,
        description: course.description,
        thumbnailUrl: course.thumbnailUrl,
      },
      access: this.toAccessStatusDto(course.id, access, hasActiveSubscription),
      modules: modules.map((courseModule) => ({
        id: courseModule.id,
        title: courseModule.title,
        description: courseModule.description,
        sortOrder: courseModule.sortOrder,
        lessons: courseModule.lessons.map((lesson) =>
          this.toLessonWatchDto(lesson, course.id),
        ),
      })),
    };
  }

  async getLessonWatch(
    userId: string | null,
    lessonId: string,
  ): Promise<LessonWatchDto> {
    if (!userId) {
      throw new ForbiddenException(
        'You do not have access to watch this lesson.',
      );
    }

    const lesson = await this.getLessonContextForUser(userId, lessonId);
    const canView = await this.canViewLesson(userId, lessonId);

    if (!canView) {
      throw new ForbiddenException(
        'You do not have access to watch this lesson.',
      );
    }

    return this.toLessonWatchDto(lesson, lesson.module.course.id);
  }

  async isCourseOwner(userId: string, courseId: string): Promise<boolean> {
    const course = await this.prisma.course.findFirst({
      where: {
        id: courseId,
        deletedAt: null,
      },
      select: {
        creatorProfile: {
          select: {
            userId: true,
            deletedAt: true,
          },
        },
      },
    });

    if (!course?.creatorProfile || course.creatorProfile.deletedAt) {
      return false;
    }

    return course.creatorProfile.userId === userId;
  }

  private async resolveCourseAccess(
    userId: string,
    course: Prisma.CourseGetPayload<object>,
  ): Promise<ResolvedCourseAccess> {
    const isOwner = await this.isCourseOwner(userId, course.id);

    if (isOwner && course.status === CourseStatus.PUBLISHED) {
      return {
        hasAccess: true,
        source: AccessGrantSource.CREATOR_OWNER,
        accessPlanId: null,
        accessPlanName: null,
        accessPlanType: null,
        expiresAt: null,
        isOwner: true,
      };
    }

    const grant = await this.findActiveCourseGrant(userId, course.id);

    if (!grant) {
      return {
        hasAccess: false,
        source: null,
        accessPlanId: null,
        accessPlanName: null,
        accessPlanType: null,
        expiresAt: null,
        isOwner,
      };
    }

    const source = this.mapGrantSource(
      grant.accessPlan.planType,
      grant.accessPlan.billingInterval,
    );

    return {
      hasAccess: true,
      source,
      accessPlanId: grant.accessPlan.id,
      accessPlanName: grant.accessPlan.name,
      accessPlanType: grant.accessPlan.planType,
      expiresAt: grant.expiresAt,
      isOwner,
    };
  }

  private async findActiveCourseGrant(userId: string, courseId: string) {
    const now = new Date();

    const grants = await this.prisma.courseAccess.findMany({
      where: {
        userId,
        courseId,
        deletedAt: null,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      include: {
        accessPlan: true,
        userSubscription: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    for (const grant of grants) {
      if (grant.userSubscriptionId) {
        const subscription = grant.userSubscription;
        const subscriptionActive =
          subscription &&
          !subscription.deletedAt &&
          ACTIVE_SUBSCRIPTION_STATUSES.includes(subscription.status) &&
          subscription.currentPeriodEnd > now;

        if (!subscriptionActive) {
          continue;
        }
      }

      if (grant.accessPlan.deletedAt || !grant.accessPlan.isActive) {
        continue;
      }

      return grant;
    }

    return null;
  }

  private mapGrantSource(
    planType: AccessPlanType,
    billingInterval: BillingInterval | null,
  ): AccessGrantSource {
    if (planType === AccessPlanType.FREE) {
      return AccessGrantSource.FREE_PLAN;
    }

    if (planType === AccessPlanType.ONE_TIME) {
      return AccessGrantSource.LIFETIME_PURCHASE;
    }

    if (billingInterval === BillingInterval.YEARLY) {
      return AccessGrantSource.SUBSCRIPTION_YEARLY;
    }

    if (billingInterval === BillingInterval.WEEKLY) {
      return AccessGrantSource.SUBSCRIPTION_WEEKLY;
    }

    return AccessGrantSource.SUBSCRIPTION_MONTHLY;
  }

  private async getCourseByIdOrThrow(courseId: string) {
    const course = await this.prisma.course.findFirst({
      where: {
        id: courseId,
        deletedAt: null,
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found.');
    }

    return course;
  }

  private async getCourseForUserAccess(userId: string, courseId: string) {
    const course = await this.getCourseByIdOrThrow(courseId);

    if (course.status === CourseStatus.PUBLISHED) {
      return course;
    }

    const grant = await this.findActiveCourseGrant(userId, courseId);

    if (grant) {
      return course;
    }

    throw new NotFoundException('Course not found.');
  }

  private async getLessonContextForUser(userId: string, lessonId: string) {
    const lesson = await this.prisma.lesson.findFirst({
      where: {
        id: lessonId,
        deletedAt: null,
        module: {
          deletedAt: null,
          course: {
            deletedAt: null,
          },
        },
      },
      include: {
        resources: {
          where: { deletedAt: null },
          orderBy: { sortOrder: 'asc' },
        },
        module: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found.');
    }

    const course = lesson.module.course;

    if (course.status === CourseStatus.PUBLISHED) {
      return lesson;
    }

    const grant = await this.findActiveCourseGrant(userId, course.id);

    if (grant) {
      return lesson;
    }

    throw new NotFoundException('Lesson not found.');
  }

  private toAccessStatusDto(
    courseId: string,
    access: ResolvedCourseAccess,
    hasActiveSubscription: boolean,
  ): CourseAccessStatusDto {
    return {
      courseId,
      hasAccess: access.hasAccess,
      canWatch: access.hasAccess,
      source: access.source,
      isOwner: access.isOwner,
      hasActiveSubscription,
      accessPlan:
        access.accessPlanId && access.accessPlanName && access.accessPlanType
          ? {
              id: access.accessPlanId,
              name: access.accessPlanName,
              planType: access.accessPlanType,
              billingInterval:
                access.source === AccessGrantSource.SUBSCRIPTION_WEEKLY
                  ? BillingInterval.WEEKLY
                  : access.source === AccessGrantSource.SUBSCRIPTION_MONTHLY
                    ? BillingInterval.MONTHLY
                    : access.source === AccessGrantSource.SUBSCRIPTION_YEARLY
                      ? BillingInterval.YEARLY
                      : null,
            }
          : null,
      expiresAt: access.expiresAt?.toISOString() ?? null,
    };
  }

  private toLessonWatchDto(
    lesson: Prisma.LessonGetPayload<{ include: { resources: true } }>,
    courseId: string,
  ): LessonWatchDto {
    return {
      id: lesson.id,
      moduleId: lesson.moduleId,
      courseId,
      title: lesson.title,
      description: lesson.description,
      materialsDescription: lesson.materialsDescription,
      sortOrder: lesson.sortOrder,
      durationSeconds: lesson.durationSeconds,
      isPreview: lesson.isPreview,
      youtube:
        lesson.youtubeVideoId && lesson.youtubeUrl
          ? {
              videoId: lesson.youtubeVideoId,
              embedUrl: `https://www.youtube.com/embed/${lesson.youtubeVideoId}`,
              watchUrl: lesson.youtubeUrl,
              thumbnailUrl: lesson.thumbnailUrl,
              provider: lesson.provider ?? 'YOUTUBE',
            }
          : null,
      resources: lesson.resources.map((resource) => ({
        id: resource.id,
        title: resource.title,
        description: resource.description,
        resourceType: resource.resourceType,
        url: resource.url,
        purchaseUrl: resource.purchaseUrl,
        accessMode: resource.accessMode,
        sortOrder: resource.sortOrder,
      })),
    };
  }
}
