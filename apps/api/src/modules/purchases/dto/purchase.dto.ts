import { PurchaseStatus } from '@smartklass/database';
import { IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class CreatePurchaseCheckoutDto {
  @IsString()
  accessPlanId!: string;

  @IsString()
  successUrl!: string;

  @IsString()
  cancelUrl!: string;
}

export class PurchaseCheckoutDto {
  checkoutUrl!: string;
  sessionId!: string;
  accessPlanId!: string;
  amountCents!: number;
  currency!: string;
}

export class PurchaseDto {
  id!: string;
  courseId!: string;
  accessPlanId!: string;
  status!: PurchaseStatus;
  amountCents!: number;
  currency!: string;
  purchasedAt!: string | null;
  expiresAt!: string | null;
  course!: {
    slug: string;
    title: string;
  };
}

export class ListPurchasesQueryDto extends PaginationQueryDto {}
