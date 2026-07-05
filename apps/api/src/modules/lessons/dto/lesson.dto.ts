import {
  LessonMaterialAccess,
  LessonResourceType,
  LessonStatus,
  VideoProvider,
} from '@smartklass/database';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateLessonDto {
  @IsString()
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  materialsDescription?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateLessonDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  materialsDescription?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  durationSeconds?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsEnum(LessonStatus)
  status?: LessonStatus;
}

export class SetLessonYoutubeDto {
  @IsUrl()
  youtubeUrl!: string;

  @IsOptional()
  @IsUrl()
  thumbnailUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  durationSeconds?: number;
}

export class CreateLessonResourceDto {
  @IsString()
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsUrl()
  url?: string;

  @IsOptional()
  @IsUrl()
  purchaseUrl?: string;

  @IsOptional()
  @IsEnum(LessonMaterialAccess)
  accessMode?: LessonMaterialAccess;

  @IsOptional()
  @IsEnum(LessonResourceType)
  resourceType?: LessonResourceType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class PublicLessonDto {
  id!: string;
  moduleId!: string;
  title!: string;
  description!: string | null;
  materialsDescription!: string | null;
  thumbnailUrl!: string | null;
  durationSeconds!: number | null;
  sortOrder!: number;
  status!: LessonStatus;
  isPreview!: boolean;
  createdAt!: string;
}

export class LessonDto extends PublicLessonDto {
  youtubeVideoId!: string | null;
  youtubeUrl!: string | null;
  provider!: VideoProvider | null;
}

export class LessonResourceDto {
  id!: string;
  title!: string;
  description!: string | null;
  resourceType!: string;
  url!: string;
  purchaseUrl!: string | null;
  accessMode!: string;
  sortOrder!: number;
}

export class LessonDetailDto extends LessonDto {
  resources!: LessonResourceDto[];
}

export class PublicLessonDetailDto extends PublicLessonDto {
  resources: LessonResourceDto[] = [];
}
