import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CourseVersionStatus } from '@smartklass/database';
import { PrismaService } from '../../common/database/prisma.service';

@Injectable()
export class CourseVersioningService {
  constructor(private readonly prisma: PrismaService) {}

  async createDraftFromLive(courseId: string, createdByUserId?: string) {
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
                resources: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } },
              },
            },
          },
        },
        accessPlans: { where: { deletedAt: null } },
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found.');
    }

    const nextVersion = course.currentVersionNumber + 1;
    const snapshot = {
      course: {
        title: course.title,
        subtitle: course.subtitle,
        description: course.description,
        thumbnailUrl: course.thumbnailUrl,
        trailerYoutubeId: course.trailerYoutubeId,
        previewMaterialsDescription: course.previewMaterialsDescription,
        estimatedHours: course.estimatedHours,
        difficultyLevel: course.difficultyLevel,
        language: course.language,
        offersCertificate: course.offersCertificate,
      },
      modules: course.modules,
      accessPlans: course.accessPlans,
    };

    return this.prisma.courseVersion.create({
      data: {
        courseId,
        versionNumber: nextVersion,
        status: CourseVersionStatus.DRAFT,
        snapshot,
        createdByUserId,
      },
    });
  }

  async publishVersion(courseId: string, versionId: string) {
    const version = await this.prisma.courseVersion.findFirst({
      where: { id: versionId, courseId },
    });

    if (!version || version.status !== CourseVersionStatus.DRAFT) {
      throw new BadRequestException('Only draft versions can be published.');
    }

    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.courseVersion.updateMany({
        where: { courseId, status: CourseVersionStatus.PUBLISHED },
        data: { status: CourseVersionStatus.ARCHIVED },
      }),
      this.prisma.courseVersion.update({
        where: { id: versionId },
        data: {
          status: CourseVersionStatus.PUBLISHED,
          publishedAt: now,
        },
      }),
      this.prisma.course.update({
        where: { id: courseId },
        data: {
          publishedVersionId: versionId,
          currentVersionNumber: version.versionNumber,
          publishedAt: now,
          status: 'PUBLISHED',
        },
      }),
    ]);

    return this.prisma.courseVersion.findUnique({ where: { id: versionId } });
  }

  async listVersions(courseId: string) {
    return this.prisma.courseVersion.findMany({
      where: { courseId },
      orderBy: { versionNumber: 'desc' },
    });
  }

  async rollback(courseId: string, versionId: string) {
    const version = await this.prisma.courseVersion.findFirst({
      where: {
        id: versionId,
        courseId,
        status: { in: [CourseVersionStatus.ARCHIVED, CourseVersionStatus.PUBLISHED] },
      },
    });

    if (!version) {
      throw new BadRequestException('Version not found.');
    }

    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.courseVersion.updateMany({
        where: { courseId, status: CourseVersionStatus.PUBLISHED, id: { not: versionId } },
        data: { status: CourseVersionStatus.ARCHIVED },
      }),
      this.prisma.courseVersion.update({
        where: { id: versionId },
        data: {
          status: CourseVersionStatus.PUBLISHED,
          publishedAt: now,
        },
      }),
      this.prisma.course.update({
        where: { id: courseId },
        data: {
          publishedVersionId: versionId,
          currentVersionNumber: version.versionNumber,
          publishedAt: now,
        },
      }),
    ]);

    return this.prisma.courseVersion.findUnique({ where: { id: versionId } });
  }
}
