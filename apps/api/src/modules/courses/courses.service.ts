import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CourseStatus } from '@smartklass/database';
import { Prisma } from '@smartklass/database';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { PaginatedResultDto } from '../../common/dto/pagination.dto';
import { CourseOwnershipService } from '../../common/courses/course-ownership.service';
import { PrismaService } from '../../common/database/prisma.service';
import {
  CourseDetailDto,
  CourseSummaryDto,
  CreateCourseDto,
  CreatorCourseListItemDto,
  CreatorCourseStudioDto,
  ListCoursesQueryDto,
  UpdateCourseDto,
} from './dto/course.dto';

const ALLOWED_THUMBNAIL_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);
const MAX_THUMBNAIL_BYTES = 5 * 1024 * 1024;

type CourseWithCreator = Prisma.CourseGetPayload<{
  include: {
    creatorProfile: { select: { slug: true; displayName: true } };
    modules: {
      where: { deletedAt: null };
      include: { lessons: { where: { deletedAt: null } } };
    };
  };
}>;

type CourseStudioPayload = Prisma.CourseGetPayload<{
  include: {
    creatorProfile: { select: { slug: true; displayName: true } };
    modules: {
      where: { deletedAt: null };
      orderBy: { sortOrder: 'asc' };
      include: {
        lessons: {
          where: { deletedAt: null };
          orderBy: { sortOrder: 'asc' };
          include: {
            resources: {
              where: { deletedAt: null };
              orderBy: { sortOrder: 'asc' };
            };
          };
        };
      };
    };
  };
}>;

@Injectable()
export class CoursesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: CourseOwnershipService,
    private readonly configService: ConfigService,
  ) {}

  async list(
    query: ListCoursesQueryDto,
  ): Promise<PaginatedResultDto<CourseSummaryDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.CourseWhereInput = {
      deletedAt: null,
      status: query.status ?? CourseStatus.PUBLISHED,
      ...(query.creator
        ? { creatorProfile: { slug: query.creator, deletedAt: null } }
        : {}),
      ...(query.category
        ? {
            categories: {
              some: {
                category: { slug: query.category, deletedAt: null },
              },
            },
          }
        : {}),
      ...(query.language ? { language: query.language } : {}),
      ...(query.certificates ? { offersCertificate: true } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search } },
              { subtitle: { contains: query.search } },
            ],
          }
        : {}),
    };

    const [courses, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        skip,
        take: limit,
        orderBy: { publishedAt: 'desc' },
        include: {
          creatorProfile: {
            select: { slug: true, displayName: true },
          },
        },
      }),
      this.prisma.course.count({ where }),
    ]);

    return {
      items: courses.map((course) => this.toCourseSummary(course)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async listMine(
    creatorProfileId: string,
    query: ListCoursesQueryDto,
  ): Promise<PaginatedResultDto<CreatorCourseListItemDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: Prisma.CourseWhereInput = {
      creatorProfileId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search } },
              { subtitle: { contains: query.search } },
            ],
          }
        : {}),
    };

    const [courses, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          creatorProfile: {
            select: { slug: true, displayName: true },
          },
          modules: {
            where: { deletedAt: null },
            include: {
              lessons: {
                where: { deletedAt: null },
                select: { id: true },
              },
            },
          },
        },
      }),
      this.prisma.course.count({ where }),
    ]);

    return {
      items: courses.map((course) => this.toCreatorCourseListItem(course)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getMineById(
    creatorProfileId: string,
    courseId: string,
  ): Promise<CreatorCourseStudioDto> {
    await this.ownership.assertOwnsCourse(creatorProfileId, courseId);

    const course = await this.prisma.course.findFirst({
      where: {
        id: courseId,
        creatorProfileId,
        deletedAt: null,
      },
      include: this.courseStudioInclude(),
    });

    if (!course) {
      throw new NotFoundException('Course not found.');
    }

    const activeSubscriberCount = await this.countActiveSubscribers(
      courseId,
      creatorProfileId,
    );

    return this.toCreatorCourseStudio(course, activeSubscriberCount);
  }

  async getPublishedById(id: string): Promise<CourseDetailDto> {
    const course = await this.prisma.course.findFirst({
      where: {
        id,
        deletedAt: null,
        status: CourseStatus.PUBLISHED,
      },
      include: this.courseDetailInclude(),
    });

    if (!course) {
      throw new NotFoundException('Course not found.');
    }

    return this.toCourseDetail(course);
  }

  async getBySlug(slug: string): Promise<CourseDetailDto> {
    const course = await this.prisma.course.findFirst({
      where: {
        slug,
        deletedAt: null,
        status: CourseStatus.PUBLISHED,
      },
      include: this.courseDetailInclude(),
    });

    if (!course) {
      throw new NotFoundException('Course not found.');
    }

    return this.toCourseDetail(course);
  }

  async create(
    creatorProfileId: string,
    dto: CreateCourseDto,
  ): Promise<CourseDetailDto> {
    const slug = dto.slug ?? (await this.generateUniqueSlug(dto.title));

    const slugTaken = await this.prisma.course.findFirst({
      where: { slug, deletedAt: null },
    });

    if (slugTaken) {
      throw new ConflictException('Course slug is already taken.');
    }

    const course = await this.prisma.course.create({
      data: {
        id: randomUUID(),
        creatorProfileId,
        slug,
        title: dto.title,
        subtitle: dto.subtitle,
        description: dto.description,
        thumbnailUrl: dto.thumbnailUrl,
        trailerYoutubeId: dto.trailerYoutubeId,
        previewMaterialsDescription: dto.previewMaterialsDescription,
        estimatedHours: dto.estimatedHours,
        difficultyLevel: dto.difficultyLevel,
        language: dto.language ?? 'en',
        status: CourseStatus.DRAFT,
      },
      include: this.courseDetailInclude(),
    });

    return this.toCourseDetail(course);
  }

  async uploadThumbnail(file: {
    buffer: Buffer;
    mimetype: string;
    size: number;
    originalname: string;
  }): Promise<{ thumbnailUrl: string }> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('No image file provided.');
    }

    if (!ALLOWED_THUMBNAIL_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        'Thumbnail must be a JPEG, PNG, WebP, or GIF image.',
      );
    }

    if (file.size > MAX_THUMBNAIL_BYTES) {
      throw new BadRequestException('Thumbnail must be 5 MB or smaller.');
    }

    const extension = this.resolveThumbnailExtension(
      file.mimetype,
      file.originalname,
    );
    const uploadsDir = join(process.cwd(), 'uploads', 'course-thumbnails');
    await mkdir(uploadsDir, { recursive: true });

    const filename = `${randomUUID()}${extension}`;
    await writeFile(join(uploadsDir, filename), file.buffer);

    const apiUrl =
      this.configService.get<string>('apiUrl') ?? 'http://localhost:4000';
    const thumbnailUrl = `${apiUrl.replace(/\/$/, '')}/uploads/course-thumbnails/${filename}`;

    return { thumbnailUrl };
  }

  async update(
    creatorProfileId: string,
    courseId: string,
    dto: UpdateCourseDto,
  ): Promise<CourseDetailDto> {
    await this.ownership.assertOwnsCourse(creatorProfileId, courseId);

    const data = Object.fromEntries(
      Object.entries({
        title: dto.title,
        subtitle: dto.subtitle,
        description: dto.description,
        thumbnailUrl: dto.thumbnailUrl,
        trailerYoutubeId: dto.trailerYoutubeId,
        previewMaterialsDescription: dto.previewMaterialsDescription,
        estimatedHours: dto.estimatedHours,
        difficultyLevel: dto.difficultyLevel,
        language: dto.language,
        status: dto.status,
      }).filter(([, value]) => value !== undefined),
    );

    const course = await this.prisma.course.update({
      where: { id: courseId },
      data,
      include: this.courseDetailInclude(),
    });

    return this.toCourseDetail(course);
  }

  async publish(
    creatorProfileId: string,
    courseId: string,
  ): Promise<CourseDetailDto> {
    const course = await this.ownership.assertOwnsCourse(
      creatorProfileId,
      courseId,
    );

    const updated = await this.prisma.course.update({
      where: { id: courseId },
      data: {
        status: CourseStatus.PUBLISHED,
        publishedAt: course.publishedAt ?? new Date(),
      },
      include: this.courseDetailInclude(),
    });

    return this.toCourseDetail(updated);
  }

  async archive(
    creatorProfileId: string,
    courseId: string,
  ): Promise<CourseDetailDto> {
    await this.ownership.assertOwnsCourse(creatorProfileId, courseId);

    const updated = await this.prisma.course.update({
      where: { id: courseId },
      data: { status: CourseStatus.ARCHIVED },
      include: this.courseDetailInclude(),
    });

    return this.toCourseDetail(updated);
  }

  private courseDetailInclude() {
    return {
      creatorProfile: {
        select: { slug: true, displayName: true },
      },
      modules: {
        where: { deletedAt: null },
        include: {
          lessons: { where: { deletedAt: null } },
        },
      },
    } satisfies Prisma.CourseInclude;
  }

  private courseStudioInclude() {
    return {
      creatorProfile: {
        select: { slug: true, displayName: true },
      },
      modules: {
        where: { deletedAt: null },
        orderBy: { sortOrder: 'asc' as const },
        include: {
          lessons: {
            where: { deletedAt: null },
            orderBy: { sortOrder: 'asc' as const },
            include: {
              resources: {
                where: { deletedAt: null },
                orderBy: { sortOrder: 'asc' as const },
              },
            },
          },
        },
      },
    } satisfies Prisma.CourseInclude;
  }

  private toCourseSummary(
    course: Prisma.CourseGetPayload<{
      include: {
        creatorProfile: { select: { slug: true; displayName: true } };
      };
    }>,
  ): CourseSummaryDto {
    return {
      id: course.id,
      slug: course.slug,
      title: course.title,
      subtitle: course.subtitle,
      thumbnailUrl: course.thumbnailUrl,
      status: course.status,
      estimatedHours: course.estimatedHours
        ? Number(course.estimatedHours)
        : null,
      difficultyLevel: course.difficultyLevel,
      language: course.language,
      offersCertificate: course.offersCertificate,
      creator: {
        slug: course.creatorProfile.slug,
        displayName: course.creatorProfile.displayName,
      },
    };
  }

  private toCreatorCourseListItem(
    course: Prisma.CourseGetPayload<{
      include: {
        creatorProfile: { select: { slug: true; displayName: true } };
        modules: {
          include: { lessons: { select: { id: true } } };
        };
      };
    }>,
  ): CreatorCourseListItemDto {
    const lessonCount = course.modules.reduce(
      (count, courseModule) => count + courseModule.lessons.length,
      0,
    );

    return {
      ...this.toCourseSummary(course),
      moduleCount: course.modules.length,
      lessonCount,
    };
  }

  private toCourseDetail(course: CourseWithCreator): CourseDetailDto {
    const lessonCount = course.modules.reduce(
      (count, courseModule) => count + courseModule.lessons.length,
      0,
    );

    return {
      ...this.toCourseSummary(course),
      description: course.description,
      trailerYoutubeId: course.trailerYoutubeId,
      previewMaterialsDescription: course.previewMaterialsDescription,
      publishedAt: course.publishedAt?.toISOString() ?? null,
      moduleCount: course.modules.length,
      lessonCount,
    };
  }

  private async countActiveSubscribers(
    courseId: string,
    creatorProfileId: string,
  ): Promise<number> {
    const creatorProfile = await this.prisma.creatorProfile.findFirst({
      where: { id: creatorProfileId, deletedAt: null },
      select: { userId: true },
    });

    const now = new Date();

    return this.prisma.courseAccess.count({
      where: {
        courseId,
        deletedAt: null,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        ...(creatorProfile ? { userId: { not: creatorProfile.userId } } : {}),
      },
    });
  }

  private toCreatorCourseStudio(
    course: CourseStudioPayload,
    activeSubscriberCount = 0,
  ): CreatorCourseStudioDto {
    const lessonCount = course.modules.reduce(
      (count, courseModule) => count + courseModule.lessons.length,
      0,
    );

    return {
      ...this.toCourseSummary(course),
      description: course.description,
      trailerYoutubeId: course.trailerYoutubeId,
      previewMaterialsDescription: course.previewMaterialsDescription,
      publishedAt: course.publishedAt?.toISOString() ?? null,
      moduleCount: course.modules.length,
      lessonCount,
      certificatePaidAt: course.certificatePaidAt?.toISOString() ?? null,
      activeSubscriberCount,
      modules: course.modules.map((courseModule) => ({
        id: courseModule.id,
        courseId: courseModule.courseId,
        title: courseModule.title,
        description: courseModule.description,
        sortOrder: courseModule.sortOrder,
        lessons: courseModule.lessons.map((lesson) => ({
          id: lesson.id,
          moduleId: lesson.moduleId,
          title: lesson.title,
          description: lesson.description,
          materialsDescription: lesson.materialsDescription,
          status: lesson.status,
          isPreview: lesson.isPreview,
          sortOrder: lesson.sortOrder,
          durationSeconds: lesson.durationSeconds,
          youtubeVideoId: lesson.youtubeVideoId,
          youtubeUrl: lesson.youtubeUrl,
          resources: lesson.resources.map((resource) => ({
            id: resource.id,
            title: resource.title,
            description: resource.description,
            resourceType: resource.resourceType,
            url: resource.url,
            purchaseUrl: resource.purchaseUrl,
            accessMode: resource.accessMode,
          })),
        })),
      })),
    };
  }

  private slugifyTitle(title: string): string {
    const base = title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 150);

    return base || 'course';
  }

  private async generateUniqueSlug(title: string): Promise<string> {
    const base = this.slugifyTitle(title);
    let slug = base;
    let suffix = 0;

    while (true) {
      const taken = await this.prisma.course.findFirst({
        where: { slug, deletedAt: null },
        select: { id: true },
      });

      if (!taken) {
        return slug;
      }

      suffix += 1;
      slug = `${base}-${suffix}`;
    }
  }

  private resolveThumbnailExtension(
    mimetype: string,
    originalname: string,
  ): string {
    const fromName = extname(originalname).toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(fromName)) {
      return fromName === '.jpg' ? '.jpeg' : fromName;
    }

    switch (mimetype) {
      case 'image/jpeg':
        return '.jpeg';
      case 'image/png':
        return '.png';
      case 'image/webp':
        return '.webp';
      case 'image/gif':
        return '.gif';
      default:
        return '.jpeg';
    }
  }
}
