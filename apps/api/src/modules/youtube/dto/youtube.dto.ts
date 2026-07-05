import { IsString, IsUrl, MaxLength } from 'class-validator';

export class ValidateYoutubeUrlQueryDto {
  @IsUrl()
  url!: string;
}

export class YoutubeVideoIdParamDto {
  @IsString()
  @MaxLength(20)
  videoId!: string;
}

export class YoutubeValidationDto {
  isValid!: boolean;
  videoId!: string | null;
  normalizedUrl!: string | null;
  thumbnailUrl!: string | null;
}

export class YoutubeOEmbedDto {
  videoId!: string;
  title!: string | null;
  authorName!: string | null;
  thumbnailUrl!: string | null;
  html!: string | null;
}
