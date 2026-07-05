import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  locale?: string;
}

export class UserProfileDto {
  id!: string;
  email!: string;
  displayName!: string;
  avatarUrl!: string | null;
  bio!: string | null;
  timezone!: string | null;
  locale!: string;
  status!: string;
  isCreator!: boolean;
  creatorProfileId!: string | null;
  creatorCourseCount!: number;
  createdAt!: string;
}

export class LibraryCourseDto {
  courseId!: string;
  slug!: string;
  title!: string;
  thumbnailUrl!: string | null;
  accessLabel!: string;
  firstLessonId!: string | null;
}

export class UserLibraryDto {
  items!: LibraryCourseDto[];
}
