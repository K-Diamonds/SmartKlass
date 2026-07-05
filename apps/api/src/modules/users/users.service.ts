import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { AuthenticatedUser } from '../../common/auth/interfaces/authenticated-user.interface';
import { PrismaService } from '../../common/database/prisma.service';
import {
  LibraryCourseDto,
  UpdateUserDto,
  UserLibraryDto,
  UserProfileDto,
} from './dto/user.dto';

const ALLOWED_AVATAR_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async getMe(user: AuthenticatedUser): Promise<UserProfileDto> {
    let record = await this.prisma.user.findFirst({
      where: {
        id: user.id,
        deletedAt: null,
      },
      include: {
        profile: true,
        creatorProfile: {
          include: {
            _count: {
              select: {
                courses: { where: { deletedAt: null } },
              },
            },
          },
        },
      },
    });

    if (!record) {
      throw new NotFoundException('User not found.');
    }

    if (!record.profile) {
      record = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          profile: {
            create: {
              displayName: user.email.split('@')[0] ?? 'Learner',
            },
          },
        },
        include: {
          profile: true,
          creatorProfile: {
            include: {
              _count: {
                select: {
                  courses: { where: { deletedAt: null } },
                },
              },
            },
          },
        },
      });
    }

    return this.toUserProfile(record);
  }

  async getMyLibrary(user: AuthenticatedUser): Promise<UserLibraryDto> {
    const now = new Date();

    const grants = await this.prisma.courseAccess.findMany({
      where: {
        userId: user.id,
        deletedAt: null,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        course: {
          select: {
            id: true,
            slug: true,
            title: true,
            thumbnailUrl: true,
            status: true,
            modules: {
              where: { deletedAt: null },
              orderBy: { sortOrder: 'asc' },
              take: 1,
              select: {
                lessons: {
                  where: {
                    deletedAt: null,
                  },
                  orderBy: { sortOrder: 'asc' },
                  select: { id: true, status: true },
                },
              },
            },
          },
        },
        accessPlan: {
          select: {
            name: true,
            planType: true,
          },
        },
      },
    });

    const seenCourseIds = new Set<string>();
    const items: LibraryCourseDto[] = [];

    for (const grant of grants) {
      if (seenCourseIds.has(grant.courseId)) {
        continue;
      }

      seenCourseIds.add(grant.courseId);
      items.push({
        courseId: grant.course.id,
        slug: grant.course.slug,
        title: grant.course.title,
        thumbnailUrl: grant.course.thumbnailUrl,
        accessLabel: this.formatLibraryAccessLabel(grant.accessPlan),
        firstLessonId: this.resolveLibraryFirstLessonId(grant.course),
      });
    }

    return { items };
  }

  private resolveLibraryFirstLessonId(course: {
    status: string;
    modules: Array<{
      lessons: Array<{ id: string; status: string }>;
    }>;
  }): string | null {
    const lessons = course.modules[0]?.lessons ?? [];

    if (lessons.length === 0) {
      return null;
    }

    if (course.status === 'PUBLISHED') {
      return lessons.find((lesson) => lesson.status === 'PUBLISHED')?.id ?? null;
    }

    return lessons[0]?.id ?? null;
  }

  async updateMe(
    user: AuthenticatedUser,
    dto: UpdateUserDto,
  ): Promise<UserProfileDto> {
    const profileData = Object.fromEntries(
      Object.entries({
        displayName: dto.displayName,
        avatarUrl: dto.avatarUrl,
        bio: dto.bio,
        timezone: dto.timezone,
        locale: dto.locale,
      }).filter(([, value]) => value !== undefined),
    );

    const record = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        profile: {
          update: profileData,
        },
      },
      include: {
        profile: true,
        creatorProfile: {
          include: {
            _count: {
              select: {
                courses: { where: { deletedAt: null } },
              },
            },
          },
        },
      },
    });

    if (!record.profile) {
      throw new NotFoundException('User profile not found.');
    }

    return this.toUserProfile(record);
  }

  async uploadAvatar(
    user: AuthenticatedUser,
    file: {
      buffer: Buffer;
      mimetype: string;
      size: number;
      originalname: string;
    },
  ): Promise<UserProfileDto> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('No image file provided.');
    }

    if (!ALLOWED_AVATAR_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        'Profile photo must be a JPEG, PNG, WebP, or GIF image.',
      );
    }

    if (file.size > MAX_AVATAR_BYTES) {
      throw new BadRequestException('Profile photo must be 2 MB or smaller.');
    }

    const extension = this.resolveAvatarExtension(file.mimetype, file.originalname);
    const uploadsDir = join(process.cwd(), 'uploads', 'avatars');
    await mkdir(uploadsDir, { recursive: true });

    const filename = `${user.id}-${Date.now()}${extension}`;
    await writeFile(join(uploadsDir, filename), file.buffer);

    const apiUrl = this.configService.get<string>('apiUrl') ?? 'http://localhost:4000';
    const avatarUrl = `${apiUrl.replace(/\/$/, '')}/uploads/avatars/${filename}`;

    return this.updateMe(user, { avatarUrl });
  }

  private resolveAvatarExtension(mimetype: string, originalname: string): string {
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

  private toUserProfile(user: {
    id: string;
    email: string;
    status: string;
    createdAt: Date;
    profile: {
      displayName: string;
      avatarUrl: string | null;
      bio: string | null;
      timezone: string | null;
      locale: string;
    } | null;
    creatorProfile: {
      id: string;
      deletedAt: Date | null;
      _count: { courses: number };
    } | null;
  }): UserProfileDto {
    if (!user.profile) {
      throw new NotFoundException('User profile not found.');
    }

    const activeCreator =
      user.creatorProfile && user.creatorProfile.deletedAt === null
        ? user.creatorProfile
        : null;

    return {
      id: user.id,
      email: user.email,
      displayName: user.profile.displayName,
      avatarUrl: user.profile.avatarUrl,
      bio: user.profile.bio,
      timezone: user.profile.timezone,
      locale: user.profile.locale,
      status: user.status,
      isCreator: Boolean(activeCreator),
      creatorProfileId: activeCreator?.id ?? null,
      creatorCourseCount: activeCreator?._count.courses ?? 0,
      createdAt: user.createdAt.toISOString(),
    };
  }

  private formatLibraryAccessLabel(plan: {
    name: string;
    planType: string;
  }): string {
    if (plan.planType === 'ONE_TIME') {
      return 'Lifetime access';
    }

    if (plan.planType === 'FREE') {
      return 'Free access';
    }

    return plan.name;
  }
}
