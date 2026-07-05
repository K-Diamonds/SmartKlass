import { IsString, Matches, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class CreateFavoriteDto {
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(191)
  courseSlug!: string;
}

export class FavoriteDto {
  id!: string;
  courseId!: string;
  createdAt!: string;
  course!: {
    slug: string;
    title: string;
    subtitle: string | null;
    thumbnailUrl: string | null;
    language: string;
    creator: {
      slug: string;
      displayName: string;
      avatarUrl: string | null;
    };
  };
}

export class ListFavoritesQueryDto extends PaginationQueryDto {}
