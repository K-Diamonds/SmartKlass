import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class CreateCommentDto {
  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsString()
  lessonId?: string;

  @IsOptional()
  @IsString()
  parentCommentId?: string;

  @IsString()
  @MaxLength(5000)
  body!: string;
}

export class CommentDto {
  id!: string;
  userId!: string;
  courseId!: string | null;
  lessonId!: string | null;
  parentCommentId!: string | null;
  body!: string;
  author!: {
    displayName: string;
    avatarUrl: string | null;
  };
  replyCount!: number;
  createdAt!: string;
}

export class ListCommentsQueryDto extends PaginationQueryDto {}
