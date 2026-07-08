import { CourseDifficultyLevel, CourseStatus } from '@smartklass/database';
import { Type, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class ListCoursesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  creator?: string;

  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true || value === '1')
  @IsBoolean()
  certificates?: boolean;
}

export class CreateCourseDto {
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(191)
  slug?: string;

  @IsString()
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  subtitle?: string;

  @IsString()
  @MaxLength(10000)
  description!: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  thumbnailUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  trailerYoutubeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  previewMaterialsDescription?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  estimatedHours?: number;

  @IsOptional()
  @IsEnum(CourseDifficultyLevel)
  difficultyLevel?: CourseDifficultyLevel;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z]{2}$/)
  language?: string;
}

export class UpdateCourseDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  subtitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  thumbnailUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  trailerYoutubeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  previewMaterialsDescription?: string | null;

  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  estimatedHours?: number;

  @IsOptional()
  @IsEnum(CourseDifficultyLevel)
  difficultyLevel?: CourseDifficultyLevel;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z]{2}$/)
  language?: string;
}

export class CourseSummaryDto {
  id!: string;
  slug!: string;
  title!: string;
  subtitle!: string | null;
  thumbnailUrl!: string | null;
  status!: CourseStatus;
  estimatedHours!: number | null;
  difficultyLevel!: CourseDifficultyLevel;
  language!: string;
  offersCertificate!: boolean;
  category!: string | null;
  creator!: {
    slug: string;
    displayName: string;
  };
}

export class CourseDetailDto extends CourseSummaryDto {
  description!: string;
  trailerYoutubeId!: string | null;
  previewMaterialsDescription!: string | null;
  publishedAt!: string | null;
  moduleCount!: number;
  lessonCount!: number;
}

export class CreatorCourseListItemDto extends CourseSummaryDto {
  moduleCount!: number;
  lessonCount!: number;
}

export class CreatorCourseStudioLessonResourceDto {
  id!: string;
  title!: string;
  description!: string | null;
  resourceType!: string;
  url!: string;
  purchaseUrl!: string | null;
  accessMode!: string;
}

export class CreatorCourseStudioLessonDto {
  id!: string;
  moduleId!: string;
  title!: string;
  description!: string | null;
  materialsDescription!: string | null;
  status!: string;
  isPreview!: boolean;
  sortOrder!: number;
  durationSeconds!: number | null;
  youtubeVideoId!: string | null;
  youtubeUrl!: string | null;
  resources!: CreatorCourseStudioLessonResourceDto[];
}

export class CreatorCourseStudioModuleDto {
  id!: string;
  courseId!: string;
  title!: string;
  description!: string | null;
  sortOrder!: number;
  lessons!: CreatorCourseStudioLessonDto[];
}

export class CreatorCourseStudioDto extends CourseDetailDto {
  certificatePaidAt!: string | null;
  activeSubscriberCount!: number;
  modules!: CreatorCourseStudioModuleDto[];
}

export class CourseThumbnailDto {
  thumbnailUrl!: string;
}
