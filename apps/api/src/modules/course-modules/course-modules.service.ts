import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@smartklass/database';
import { CourseOwnershipService } from '../../common/courses/course-ownership.service';
import { PrismaService } from '../../common/database/prisma.service';
import {
  CourseModuleDto,
  CreateCourseModuleDto,
  UpdateCourseModuleDto,
} from './dto/course-module.dto';
import { ReorderModulesDto } from './dto/reorder.dto';

@Injectable()
export class CourseModulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: CourseOwnershipService,
  ) {}

  async listByCourse(courseId: string): Promise<CourseModuleDto[]> {
    await this.ownership.getPublishedCourseOrThrow(courseId);

    const modules = await this.prisma.courseModule.findMany({
      where: {
        courseId,
        deletedAt: null,
      },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: {
            lessons: { where: { deletedAt: null } },
          },
        },
      },
    });

    return modules.map((courseModule) => this.toDto(courseModule));
  }

  async create(
    creatorProfileId: string,
    courseId: string,
    dto: CreateCourseModuleDto,
  ): Promise<CourseModuleDto> {
    await this.ownership.assertOwnsCourse(creatorProfileId, courseId);

    const sortOrder =
      dto.sortOrder ??
      (await this.prisma.courseModule.count({
        where: { courseId, deletedAt: null },
      }));

    const courseModule = await this.prisma.courseModule.create({
      data: {
        courseId,
        title: dto.title,
        description: dto.description,
        sortOrder,
      },
      include: {
        _count: {
          select: {
            lessons: { where: { deletedAt: null } },
          },
        },
      },
    });

    return this.toDto(courseModule);
  }

  async update(
    creatorProfileId: string,
    moduleId: string,
    dto: UpdateCourseModuleDto,
  ): Promise<CourseModuleDto> {
    await this.ownership.assertOwnsModule(creatorProfileId, moduleId);

    const data = Object.fromEntries(
      Object.entries({
        title: dto.title,
        description: dto.description,
        sortOrder: dto.sortOrder,
      }).filter(([, value]) => value !== undefined),
    );

    const courseModule = await this.prisma.courseModule.update({
      where: { id: moduleId },
      data,
      include: {
        _count: {
          select: {
            lessons: { where: { deletedAt: null } },
          },
        },
      },
    });

    return this.toDto(courseModule);
  }

  async reorder(
    creatorProfileId: string,
    courseId: string,
    dto: ReorderModulesDto,
  ): Promise<CourseModuleDto[]> {
    await this.ownership.assertOwnsCourse(creatorProfileId, courseId);

    const modules = await this.prisma.courseModule.findMany({
      where: {
        courseId,
        deletedAt: null,
      },
      select: { id: true },
    });

    const existingIds = new Set(modules.map((module) => module.id));

    if (
      dto.moduleIds.length !== modules.length ||
      dto.moduleIds.some((id) => !existingIds.has(id))
    ) {
      throw new BadRequestException(
        'Module reorder payload must include all course modules.',
      );
    }

    await this.prisma.$transaction(
      dto.moduleIds.map((moduleId, index) =>
        this.prisma.courseModule.update({
          where: { id: moduleId },
          data: { sortOrder: index },
        }),
      ),
    );

    return this.listByCourse(courseId);
  }

  async remove(
    creatorProfileId: string,
    moduleId: string,
  ): Promise<{ message: string }> {
    await this.ownership.assertOwnsModule(creatorProfileId, moduleId);

    await this.prisma.courseModule.update({
      where: { id: moduleId },
      data: { deletedAt: new Date() },
    });

    return { message: 'Module archived.' };
  }

  private toDto(
    courseModule: Prisma.CourseModuleGetPayload<{
      include: { _count: { select: { lessons: true } } };
    }>,
  ): CourseModuleDto {
    return {
      id: courseModule.id,
      courseId: courseModule.courseId,
      title: courseModule.title,
      description: courseModule.description,
      sortOrder: courseModule.sortOrder,
      lessonCount: courseModule._count.lessons,
      createdAt: courseModule.createdAt.toISOString(),
    };
  }
}
