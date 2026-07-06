import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CourseVersionStatus } from '@smartklass/database';
import { PrismaService } from '../../common/database/prisma.service';
import {
  applyCourseSnapshot,
  buildSnapshotFromCourse,
} from './course-version-apply';
import {
  CourseSnapshotData,
  diffCourseSnapshots,
  VersionDiffItem,
} from './course-version-snapshot.types';

@Injectable()
export class CourseVersioningService {
  constructor(private readonly prisma: PrismaService) {}

  async createDraftFromLive(courseId: string, createdByUserId?: string) {
    const course = await this.loadLiveCourse(courseId);
    const nextVersion = course.currentVersionNumber + 1;
    const snapshot = buildSnapshotFromCourse({
      ...course,
      modules: course.modules as never,
      accessPlans: course.accessPlans,
    });

    return this.prisma.courseVersion.create({
      data: {
        courseId,
        versionNumber: nextVersion,
        status: CourseVersionStatus.DRAFT,
        snapshot: snapshot,
        createdByUserId,
      },
    });
  }

  async publishVersion(courseId: string, versionId: string) {
    return this.promoteVersion(courseId, versionId, CourseVersionStatus.DRAFT);
  }

  async rollback(courseId: string, versionId: string) {
    return this.promoteVersion(courseId, versionId, null);
  }

  async scheduleVersion(
    courseId: string,
    versionId: string,
    scheduledFor: Date,
  ) {
    const version = await this.prisma.courseVersion.findFirst({
      where: { id: versionId, courseId, status: CourseVersionStatus.DRAFT },
    });

    if (!version) {
      throw new BadRequestException('Only draft versions can be scheduled.');
    }

    return this.prisma.courseVersion.update({
      where: { id: versionId },
      data: {
        status: CourseVersionStatus.SCHEDULED,
        scheduledFor,
      },
    });
  }

  async publishDueScheduledVersions(): Promise<number> {
    const due = await this.prisma.courseVersion.findMany({
      where: {
        status: CourseVersionStatus.SCHEDULED,
        scheduledFor: { lte: new Date() },
      },
      take: 20,
    });

    for (const version of due) {
      await this.promoteVersion(
        version.courseId,
        version.id,
        CourseVersionStatus.SCHEDULED,
      );
    }

    return due.length;
  }

  async listVersions(courseId: string) {
    return this.prisma.courseVersion.findMany({
      where: { courseId },
      orderBy: { versionNumber: 'desc' },
    });
  }

  async diffVersions(
    courseId: string,
    fromVersionId: string,
    toVersionId: string,
  ): Promise<VersionDiffItem[]> {
    const [fromVersion, toVersion] = await Promise.all([
      this.prisma.courseVersion.findFirst({
        where: { id: fromVersionId, courseId },
      }),
      this.prisma.courseVersion.findFirst({
        where: { id: toVersionId, courseId },
      }),
    ]);

    if (!fromVersion || !toVersion) {
      throw new NotFoundException('Version not found.');
    }

    return diffCourseSnapshots(
      fromVersion.snapshot as CourseSnapshotData,
      toVersion.snapshot as CourseSnapshotData,
    );
  }

  private async promoteVersion(
    courseId: string,
    versionId: string,
    requiredStatus: CourseVersionStatus | null,
  ) {
    const version = await this.prisma.courseVersion.findFirst({
      where: { id: versionId, courseId },
    });

    if (!version) {
      throw new NotFoundException('Version not found.');
    }

    if (requiredStatus && version.status !== requiredStatus) {
      throw new BadRequestException(
        `Version must be ${requiredStatus} to publish.`,
      );
    }

    if (
      !requiredStatus &&
      version.status !== CourseVersionStatus.ARCHIVED &&
      version.status !== CourseVersionStatus.PUBLISHED
    ) {
      throw new BadRequestException('Version cannot be rolled back.');
    }

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await applyCourseSnapshot(tx, courseId, version.snapshot);

      await tx.courseVersion.updateMany({
        where: {
          courseId,
          status: CourseVersionStatus.PUBLISHED,
          id: { not: versionId },
        },
        data: { status: CourseVersionStatus.ARCHIVED },
      });

      await tx.courseVersion.update({
        where: { id: versionId },
        data: {
          status: CourseVersionStatus.PUBLISHED,
          publishedAt: now,
          scheduledFor: null,
        },
      });

      await tx.course.update({
        where: { id: courseId },
        data: {
          publishedVersionId: versionId,
          currentVersionNumber: version.versionNumber,
          publishedAt: now,
          status: 'PUBLISHED',
        },
      });
    });

    return this.prisma.courseVersion.findUnique({ where: { id: versionId } });
  }

  private async loadLiveCourse(courseId: string) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, deletedAt: null },
      include: {
        modules: {
          where: { deletedAt: null },
          orderBy: { sortOrder: 'asc' },
          include: {
            lessons: {
              where: { deletedAt: null },
              orderBy: { sortOrder: 'asc' },
              include: {
                resources: {
                  where: { deletedAt: null },
                  orderBy: { sortOrder: 'asc' },
                },
              },
            },
          },
        },
        accessPlans: {
          where: { deletedAt: null },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found.');
    }

    return course;
  }
}
