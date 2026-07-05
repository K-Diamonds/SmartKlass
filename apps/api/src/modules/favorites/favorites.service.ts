import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CourseStatus, Prisma } from '@smartklass/database';
import { PaginatedResultDto } from '../../common/dto/pagination.dto';
import { AuthenticatedUser } from '../../common/auth/interfaces/authenticated-user.interface';
import { PrismaService } from '../../common/database/prisma.service';
import {
  CreateFavoriteDto,
  FavoriteDto,
  ListFavoritesQueryDto,
} from './dto/favorite.dto';

const favoriteInclude = {
  course: {
    include: {
      creatorProfile: {
        select: { slug: true, displayName: true, avatarUrl: true },
      },
    },
  },
} satisfies Prisma.FavoriteInclude;

type FavoriteWithCourse = Prisma.FavoriteGetPayload<{
  include: typeof favoriteInclude;
}>;

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  async listMine(
    user: AuthenticatedUser,
    query: ListFavoritesQueryDto,
  ): Promise<PaginatedResultDto<FavoriteDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = { userId: user.id };

    const [favorites, total] = await Promise.all([
      this.prisma.favorite.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: favoriteInclude,
      }),
      this.prisma.favorite.count({ where }),
    ]);

    return {
      items: favorites.map((favorite) => this.toFavoriteDto(favorite)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async create(
    user: AuthenticatedUser,
    dto: CreateFavoriteDto,
  ): Promise<FavoriteDto> {
    const course = await this.findPublishedCourseBySlug(dto.courseSlug);

    const existing = await this.prisma.favorite.findUnique({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId: course.id,
        },
      },
      include: favoriteInclude,
    });

    if (existing) {
      return this.toFavoriteDto(existing);
    }

    try {
      const favorite = await this.prisma.favorite.create({
        data: {
          userId: user.id,
          courseId: course.id,
        },
        include: favoriteInclude,
      });

      return this.toFavoriteDto(favorite);
    } catch {
      throw new ConflictException('Course is already in your favorites.');
    }
  }

  async remove(
    user: AuthenticatedUser,
    courseSlug: string,
  ): Promise<{ message: string }> {
    const course = await this.findPublishedCourseBySlug(courseSlug);

    const favorite = await this.prisma.favorite.findUnique({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId: course.id,
        },
      },
    });

    if (!favorite) {
      throw new NotFoundException('Favorite not found.');
    }

    await this.prisma.favorite.delete({
      where: { id: favorite.id },
    });

    return { message: 'Removed from favorites.' };
  }

  private async findPublishedCourseBySlug(slug: string) {
    const course = await this.prisma.course.findFirst({
      where: {
        slug,
        deletedAt: null,
        status: CourseStatus.PUBLISHED,
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found.');
    }

    return course;
  }

  private toFavoriteDto(favorite: FavoriteWithCourse): FavoriteDto {
    return {
      id: favorite.id,
      courseId: favorite.courseId,
      createdAt: favorite.createdAt.toISOString(),
      course: {
        slug: favorite.course.slug,
        title: favorite.course.title,
        subtitle: favorite.course.subtitle,
        thumbnailUrl: favorite.course.thumbnailUrl,
        language: favorite.course.language,
        creator: {
          slug: favorite.course.creatorProfile.slug,
          displayName: favorite.course.creatorProfile.displayName,
          avatarUrl: favorite.course.creatorProfile.avatarUrl,
        },
      },
    };
  }
}
