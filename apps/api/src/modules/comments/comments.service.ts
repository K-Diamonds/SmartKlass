import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@smartklass/database';
import { AuthenticatedUser } from '../../common/auth/interfaces/authenticated-user.interface';
import { PaginatedResultDto } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../common/database/prisma.service';
import {
  CommentDto,
  CreateCommentDto,
  ListCommentsQueryDto,
} from './dto/comment.dto';

const authorInclude = {
  profile: { select: { displayName: true, avatarUrl: true } },
  creatorProfile: { select: { displayName: true, avatarUrl: true } },
} satisfies Prisma.UserInclude;

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async listByCourse(
    courseId: string,
    query: ListCommentsQueryDto,
  ): Promise<PaginatedResultDto<CommentDto>> {
    return this.listComments({ courseId, parentCommentId: null }, query);
  }

  async listByLesson(
    lessonId: string,
    query: ListCommentsQueryDto,
  ): Promise<PaginatedResultDto<CommentDto>> {
    return this.listComments({ lessonId, parentCommentId: null }, query);
  }

  async create(
    user: AuthenticatedUser,
    dto: CreateCommentDto,
  ): Promise<CommentDto> {
    if (!dto.courseId && !dto.lessonId) {
      throw new BadRequestException('courseId or lessonId is required.');
    }

    if (dto.courseId) {
      const course = await this.prisma.course.findFirst({
        where: { id: dto.courseId, deletedAt: null },
      });
      if (!course) {
        throw new NotFoundException('Course not found.');
      }
    }

    if (dto.lessonId) {
      const lesson = await this.prisma.lesson.findFirst({
        where: { id: dto.lessonId, deletedAt: null },
      });
      if (!lesson) {
        throw new NotFoundException('Lesson not found.');
      }
    }

    const comment = await this.prisma.comment.create({
      data: {
        userId: user.id,
        courseId: dto.courseId,
        lessonId: dto.lessonId,
        parentCommentId: dto.parentCommentId,
        body: dto.body,
      },
      include: {
        user: { include: authorInclude },
        _count: { select: { replies: true } },
      },
    });

    return this.toCommentDto(comment);
  }

  async remove(
    user: AuthenticatedUser,
    id: string,
  ): Promise<{ message: string }> {
    const comment = await this.prisma.comment.findFirst({
      where: { id, deletedAt: null },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found.');
    }

    if (comment.userId !== user.id) {
      throw new ForbiddenException('You can only delete your own comments.');
    }

    await this.prisma.comment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { message: 'Comment deleted.' };
  }

  private async listComments(
    where: Prisma.CommentWhereInput,
    query: ListCommentsQueryDto,
  ): Promise<PaginatedResultDto<CommentDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const filter = { ...where, deletedAt: null };

    const [comments, total] = await Promise.all([
      this.prisma.comment.findMany({
        where: filter,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { include: authorInclude },
          _count: { select: { replies: true } },
        },
      }),
      this.prisma.comment.count({ where: filter }),
    ]);

    return {
      items: comments.map((comment) => this.toCommentDto(comment)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  private toCommentDto(comment: {
    id: string;
    userId: string;
    courseId: string | null;
    lessonId: string | null;
    parentCommentId: string | null;
    body: string;
    createdAt: Date;
    user: {
      profile: { displayName: string; avatarUrl: string | null } | null;
      creatorProfile: { displayName: string; avatarUrl: string | null } | null;
    };
    _count: { replies: number };
  }): CommentDto {
    return {
      id: comment.id,
      userId: comment.userId,
      courseId: comment.courseId,
      lessonId: comment.lessonId,
      parentCommentId: comment.parentCommentId,
      body: comment.body,
      author: {
        displayName:
          comment.user.profile?.displayName ??
          comment.user.creatorProfile?.displayName ??
          'Learner',
        avatarUrl:
          comment.user.profile?.avatarUrl ??
          comment.user.creatorProfile?.avatarUrl ??
          null,
      },
      replyCount: comment._count.replies,
      createdAt: comment.createdAt.toISOString(),
    };
  }
}
