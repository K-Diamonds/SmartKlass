import {
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
} from 'class-validator';

export class BecomeCreatorDto {
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(191)
  slug!: string;

  @IsString()
  @MaxLength(100)
  displayName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  headline?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  avatarUrl?: string;
}

/** @deprecated Use BecomeCreatorDto */
export class CreateCreatorProfileDto extends BecomeCreatorDto {}

export class UpdateCreatorProfileDto {
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(191)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  headline?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  avatarUrl?: string;
}

export class CreatorProfileDto {
  id!: string;
  userId!: string;
  slug!: string;
  displayName!: string;
  headline!: string | null;
  bio!: string | null;
  avatarUrl!: string | null;
  isVerified!: boolean;
  isActive!: boolean;
  createdAt!: string;
}

export class CreatorPublicProfileDto {
  slug!: string;
  displayName!: string;
  headline!: string | null;
  bio!: string | null;
  avatarUrl!: string | null;
  isVerified!: boolean;
  courseCount!: number;
}

export class CreatorDirectoryItemDto {
  slug!: string;
  displayName!: string;
  avatarUrl!: string | null;
  courseCount!: number;
}
