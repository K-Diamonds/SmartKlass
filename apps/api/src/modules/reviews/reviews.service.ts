import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@smartklass/database';
import { AuthenticatedUser } from '../../common/auth/interfaces/authenticated-user.interface';
import { PaginatedResultDto } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../common/database/prisma.service';
import {
  CreateReviewDto,
  ListReviewsQueryDto,
  ReviewDto,
  UpdateReviewDto,
} from './dto/review.dto';

const authorInclude = {
  profile: { select: { displayName: true, avatarUrl: true } },
  creatorProfile: { select: { displayName: true, avatarUrl: true } },
} satisfies Prisma.UserInclude;

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async listByCourse(
    courseId: string,
    query: ListReviewsQueryDto,
  ): Promise<PaginatedResultDto<ReviewDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const where = {
      courseId,
      isPublished: true,
      deletedAt: null,
    };

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { include: authorInclude } },
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      items: reviews.map((review) => this.toReviewDto(review)),
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
    courseId: string,
    dto: CreateReviewDto,
  ): Promise<ReviewDto> {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, deletedAt: null },
    });

    if (!course) {
      throw new NotFoundException('Course not found.');
    }

    const existing = await this.prisma.review.findUnique({
      where: {
        userId_courseId: { userId: user.id, courseId },
      },
    });

    if (existing && !existing.deletedAt) {
      throw new ConflictException('You already reviewed this course.');
    }

    const review = existing
      ? await this.prisma.review.update({
          where: { id: existing.id },
          data: {
            rating: dto.rating,
            title: dto.title,
            body: dto.body,
            isPublished: true,
            deletedAt: null,
          },
          include: { user: { include: authorInclude } },
        })
      : await this.prisma.review.create({
          data: {
            userId: user.id,
            courseId,
            rating: dto.rating,
            title: dto.title,
            body: dto.body,
          },
          include: { user: { include: authorInclude } },
        });

    return this.toReviewDto(review);
  }

  async update(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateReviewDto,
  ): Promise<ReviewDto> {
    const review = await this.prisma.review.findFirst({
      where: { id, deletedAt: null },
    });

    if (!review) {
      throw new NotFoundException('Review not found.');
    }

    if (review.userId !== user.id) {
      throw new ForbiddenException('You can only edit your own reviews.');
    }

    const updated = await this.prisma.review.update({
      where: { id },
      data: {
        rating: dto.rating,
        title: dto.title,
        body: dto.body,
      },
      include: { user: { include: authorInclude } },
    });

    return this.toReviewDto(updated);
  }

  private toReviewDto(review: {
    id: string;
    courseId: string;
    userId: string;
    rating: number;
    title: string | null;
    body: string | null;
    createdAt: Date;
    user: {
      profile: { displayName: string; avatarUrl: string | null } | null;
      creatorProfile: { displayName: string; avatarUrl: string | null } | null;
    };
  }): ReviewDto {
    return {
      id: review.id,
      courseId: review.courseId,
      userId: review.userId,
      rating: review.rating,
      title: review.title,
      body: review.body,
      author: {
        displayName:
          review.user.profile?.displayName ??
          review.user.creatorProfile?.displayName ??
          'Learner',
        avatarUrl:
          review.user.profile?.avatarUrl ??
          review.user.creatorProfile?.avatarUrl ??
          null,
      },
      createdAt: review.createdAt.toISOString(),
    };
  }
}
