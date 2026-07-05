import { AccessPlanType, BillingInterval } from '@smartklass/database';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class PlanFeatureInputDto {
  @IsString()
  @MaxLength(100)
  key!: string;

  @IsString()
  @MaxLength(255)
  label!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateAccessPlanDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsEnum(AccessPlanType)
  planType!: AccessPlanType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  priceCents?: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ValidateIf(
    (dto: CreateAccessPlanDto) => dto.planType === AccessPlanType.SUBSCRIPTION,
  )
  @IsEnum(BillingInterval)
  billingInterval?: BillingInterval;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  accessDurationDays?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanFeatureInputDto)
  features?: PlanFeatureInputDto[];
}

export class UpdateAccessPlanDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  priceCents?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class PlanFeatureDto {
  key!: string;
  label!: string;
  description!: string | null;
  sortOrder!: number;
}

export class AccessPlanDto {
  id!: string;
  courseId!: string;
  name!: string;
  description!: string | null;
  planType!: AccessPlanType;
  priceCents!: number;
  currency!: string;
  billingInterval!: BillingInterval | null;
  accessDurationDays!: number | null;
  isActive!: boolean;
  features!: PlanFeatureDto[];
}
