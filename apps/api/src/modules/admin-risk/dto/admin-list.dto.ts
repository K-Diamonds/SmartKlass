import { Type } from 'class-transformer';
import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { RefundRequestStatus } from '@smartklass/database';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class AdminListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  creatorProfileId?: string;

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;
}

export class RequestRefundDto {
  @IsString()
  paymentId!: string;

  @Type(() => Number)
  amountCents!: number;

  @IsString()
  @MaxLength(2000)
  reason!: string;
}

export class RefundActionDto {
  @IsString()
  @MaxLength(2000)
  reason!: string;
}

export class DenyRefundDto extends RefundActionDto {
  @IsString()
  @MaxLength(2000)
  denialReason!: string;
}

export class RefundRequestQueryDto extends AdminListQueryDto {
  @IsOptional()
  @IsEnum(RefundRequestStatus)
  declare status?: RefundRequestStatus;

  @IsOptional()
  @IsString()
  paymentId?: string;
}
