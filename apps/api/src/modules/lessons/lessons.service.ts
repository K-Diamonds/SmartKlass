import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CourseStatus,
  LessonMaterialAccess,
  LessonResourceType,
  LessonStatus,
  VideoProvider,
} from '@smartklass/database';
import { Prisma } from '@smartklass/database';
import { CourseOwnershipService } from '../../common/courses/course-ownership.service';
import { PrismaService } from '../../common/database/prisma.service';
import { parseYoutubeUrl } from '../../common/youtube/parse-youtube-url';
import {
  CreateLessonDto,
  CreateLessonResourceDto,
  LessonDetailDto,
  LessonDto,
  PublicLessonDetailDto,
  PublicLessonDto,
  SetLessonYoutubeDto,
  UpdateLessonDto,
} from './dto/lesson.dto';
import { ReorderLessonsDto } from './dto/reorder-lessons.dto';

@Injectable()
export class LessonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: CourseOwnershipService,
  ) {}

  async listByModule(moduleId: string): Promise<PublicLessonDto[]> {
    const courseModule = await this.prisma.courseModule.findFirst({
      where: {
        id: moduleId,
        deletedAt: null,
        course: {
          deletedAt: null,
          status: CourseStatus.PUBLISHED,
        },
      },
    });

    if (!courseModule) {
      throw new NotFoundException('Module not found.');
    }

    const lessons = await this.prisma.lesson.findMany({
      where: {
        moduleId,
        deletedAt: null,
        status: LessonStatus.PUBLISHED,
      },
      orderBy: { sortOrder: 'asc' },
    });

    return lessons.map((lesson) => this.toPublicLessonDto(lesson));
  }

  async getPublicById(lessonId: string): Promise<PublicLessonDetailDto> {
    const lesson = await this.prisma.lesson.findFirst({
      where: {
        id: lessonId,
        deletedAt: null,
        status: LessonStatus.PUBLISHED,
        module: {
          deletedAt: null,
          course: {
            deletedAt: null,
            status: CourseStatus.PUBLISHED,
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found.');
    }

    return this.toPublicLessonDetail(lesson);
  }

  async create(
    creatorProfileId: string,
    moduleId: string,
    dto: CreateLessonDto,
  ): Promise<LessonDetailDto> {
    const courseModule = await this.ownership.assertOwnsModule(
      creatorProfileId,
      moduleId,
    );

    const sortOrder =
      dto.sortOrder ??
      (await this.prisma.lesson.count({
        where: { moduleId, deletedAt: null },
      }));

    const lesson = await this.prisma.lesson.create({
      data: {
        moduleId: courseModule.id,
        title: dto.title,
        description: dto.description,
        materialsDescription: dto.materialsDescription,
        sortOrder,
        isPreview: false,
        status: LessonStatus.DRAFT,
      },
      include: {
        resources: {
          where: { deletedAt: null },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    return this.toLessonDetail(lesson);
  }

  async getById(lessonId: string): Promise<LessonDetailDto> {
    const lesson = await this.prisma.lesson.findFirst({
      where: {
        id: lessonId,
        deletedAt: null,
      },
      include: {
        resources: {
          where: { deletedAt: null },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found.');
    }

    return this.toLessonDetail(lesson);
  }

  async update(
    creatorProfileId: string,
    lessonId: string,
    dto: UpdateLessonDto,
  ): Promise<LessonDetailDto> {
    await this.ownership.assertOwnsLesson(creatorProfileId, lessonId);

    const data = Object.fromEntries(
      Object.entries({
        title: dto.title,
        description: dto.description,
        materialsDescription: dto.materialsDescription,
        durationSeconds: dto.durationSeconds,
        sortOrder: dto.sortOrder,
        status: dto.status,
      }).filter(([, value]) => value !== undefined),
    );

    const lesson = await this.prisma.lesson.update({
      where: { id: lessonId },
      data,
      include: {
        resources: {
          where: { deletedAt: null },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    return this.toLessonDetail(lesson);
  }

  async setYoutube(
    creatorProfileId: string,
    lessonId: string,
    dto: SetLessonYoutubeDto,
  ): Promise<LessonDetailDto> {
    await this.ownership.assertOwnsLesson(creatorProfileId, lessonId);

    const parsed = parseYoutubeUrl(dto.youtubeUrl);

    if (!parsed) {
      throw new BadRequestException('Invalid YouTube URL.');
    }

    const lesson = await this.prisma.lesson.update({
      where: { id: lessonId },
      data: {
        youtubeUrl: parsed.normalizedUrl,
        youtubeVideoId: parsed.videoId,
        thumbnailUrl: dto.thumbnailUrl ?? parsed.thumbnailUrl,
        provider: VideoProvider.YOUTUBE,
        durationSeconds: dto.durationSeconds,
      },
      include: {
        resources: {
          where: { deletedAt: null },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    return this.toLessonDetail(lesson);
  }

  async addResource(
    creatorProfileId: string,
    lessonId: string,
    dto: CreateLessonResourceDto,
  ): Promise<LessonDetailDto> {
    await this.ownership.assertOwnsLesson(creatorProfileId, lessonId);

    const sortOrder =
      dto.sortOrder ??
      (await this.prisma.lessonResource.count({
        where: { lessonId, deletedAt: null },
      }));

    const accessMode = dto.accessMode ?? LessonMaterialAccess.INCLUDED;
    const resourceUrl = dto.url ?? dto.purchaseUrl;

    if (!resourceUrl) {
      throw new BadRequestException('A resource link or purchase link is required.');
    }

    const resourceType =
      dto.resourceType ??
      (accessMode === LessonMaterialAccess.VIDEO
        ? LessonResourceType.VIDEO
        : LessonResourceType.LINK);

    await this.prisma.lessonResource.create({
      data: {
        lessonId,
        title: dto.title,
        description: dto.description,
        resourceType,
        url: resourceUrl,
        purchaseUrl: dto.purchaseUrl,
        accessMode,
        sortOrder,
      },
    });

    return this.getById(lessonId);
  }

  async reorder(
    creatorProfileId: string,
    moduleId: string,
    dto: ReorderLessonsDto,
  ): Promise<LessonDto[]> {
    await this.ownership.assertOwnsModule(creatorProfileId, moduleId);

    const lessons = await this.prisma.lesson.findMany({
      where: {
        moduleId,
        deletedAt: null,
      },
      select: { id: true },
    });

    const existingIds = new Set(lessons.map((lesson) => lesson.id));

    if (
      dto.lessonIds.length !== lessons.length ||
      dto.lessonIds.some((id) => !existingIds.has(id))
    ) {
      throw new BadRequestException(
        'Lesson reorder payload must include all module lessons.',
      );
    }

    await this.prisma.$transaction(
      dto.lessonIds.map((id, index) =>
        this.prisma.lesson.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );

    return this.listByModuleForCreator(moduleId);
  }

  private async listByModuleForCreator(moduleId: string): Promise<LessonDto[]> {
    const lessons = await this.prisma.lesson.findMany({
      where: {
        moduleId,
        deletedAt: null,
      },
      orderBy: { sortOrder: 'asc' },
    });

    return lessons.map((lesson) => this.toLessonDto(lesson));
  }

  async remove(
    creatorProfileId: string,
    lessonId: string,
  ): Promise<{ message: string }> {
    await this.ownership.assertOwnsLesson(creatorProfileId, lessonId);

    await this.prisma.lesson.update({
      where: { id: lessonId },
      data: { deletedAt: new Date() },
    });

    return { message: 'Lesson archived.' };
  }

  private toPublicLessonDto(
    lesson: Prisma.LessonGetPayload<object>,
  ): PublicLessonDto {
    return {
      id: lesson.id,
      moduleId: lesson.moduleId,
      title: lesson.title,
      description: lesson.description,
      materialsDescription: lesson.materialsDescription,
      thumbnailUrl: lesson.thumbnailUrl,
      durationSeconds: lesson.durationSeconds,
      sortOrder: lesson.sortOrder,
      status: lesson.status,
      isPreview: lesson.isPreview,
      createdAt: lesson.createdAt.toISOString(),
    };
  }

  private toPublicLessonDetail(
    lesson: Prisma.LessonGetPayload<object>,
  ): PublicLessonDetailDto {
    return {
      ...this.toPublicLessonDto(lesson),
      resources: [],
    };
  }

  private toLessonDto(lesson: Prisma.LessonGetPayload<object>): LessonDto {
    return {
      ...this.toPublicLessonDto(lesson),
      youtubeVideoId: lesson.youtubeVideoId,
      youtubeUrl: lesson.youtubeUrl,
      provider: lesson.provider,
    };
  }

  private toLessonDetail(
    lesson: Prisma.LessonGetPayload<{
      include: { resources: true };
    }>,
  ): LessonDetailDto {
    return {
      ...this.toLessonDto(lesson),
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
