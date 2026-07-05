import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { Public } from '../../common/auth';
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
  create(@Body() dto: CreateCommentDto): Promise<CommentDto> {
    return this.commentsService.create(dto);
  }

  @Delete('comments/:id')
  remove(@Param() params: IdParamDto): Promise<{ message: string }> {
    return this.commentsService.remove(params.id);
  }
}
