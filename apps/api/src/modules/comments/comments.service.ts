import { Injectable } from '@nestjs/common';
import { PaginatedResultDto } from '../../common/dto/pagination.dto';
import { PlaceholderService } from '../../common/services/placeholder.service';
import {
  CommentDto,
  CreateCommentDto,
  ListCommentsQueryDto,
} from './dto/comment.dto';

@Injectable()
export class CommentsService extends PlaceholderService {
  listByCourse(
    _courseId: string,
    _query: ListCommentsQueryDto,
  ): Promise<PaginatedResultDto<CommentDto>> {
    this.notImplemented('Course comment listing');
  }

  listByLesson(
    _lessonId: string,
    _query: ListCommentsQueryDto,
  ): Promise<PaginatedResultDto<CommentDto>> {
    this.notImplemented('Lesson comment listing');
  }

  create(_dto: CreateCommentDto): Promise<CommentDto> {
    this.notImplemented('Comment creation');
  }

  remove(_id: string): Promise<{ message: string }> {
    this.notImplemented('Comment deletion');
  }
}
