import { plainToInstance } from 'class-transformer';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class PaginationMetaDto {
  page!: number;
  limit!: number;
  total!: number;
  totalPages!: number;
}

export class PaginatedResultDto<T> {
  items!: T[];
  meta!: PaginationMetaDto;
}

export class IdParamDto {
  @IsString()
  id!: string;
}

export class SlugParamDto {
  @IsString()
  slug!: string;
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export function toDto<T>(cls: new () => T, plain: object): T {
  return plainToInstance(cls, plain, { excludeExtraneousValues: true });
}
