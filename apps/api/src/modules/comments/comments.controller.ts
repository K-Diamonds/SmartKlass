import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser, Public } from '../../common/auth';
import type { AuthenticatedUser } from '../../common/auth/interfaces/authenticated-user.interface';
import {
  IdParamDto,
  PaginatedResultDto,
} from '../../common/dto/pagination.dto';
import {
  CommentDto,
  CreateCommentDto,
  ListCommentsQueryDto,
} from './dto/comment.dto';
import { CommentsService } from './comments.service';

@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Public()
  @Get('courses/:courseId/comments')
  listByCourse(
    @Param('courseId') courseId: string,
    @Query() query: ListCommentsQueryDto,
  ): Promise<PaginatedResultDto<CommentDto>> {
    return this.commentsService.listByCourse(courseId, query);
  }

  @Public()
  @Get('lessons/:lessonId/comments')
  listByLesson(
    @Param('lessonId') lessonId: string,
    @Query() query: ListCommentsQueryDto,
  ): Promise<PaginatedResultDto<CommentDto>> {
    return this.commentsService.listByLesson(lessonId, query);
  }

  @Post('comments')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCommentDto,
  ): Promise<CommentDto> {
    return this.commentsService.create(user, dto);
  }

  @Delete('comments/:id')
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: IdParamDto,
  ): Promise<{ message: string }> {
    return this.commentsService.remove(user, params.id);
  }
}
