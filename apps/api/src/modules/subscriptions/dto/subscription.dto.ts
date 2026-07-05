import { SubscriptionStatus } from '@smartklass/database';
import { IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class CreateSubscriptionCheckoutDto {
  @IsString()
  accessPlanId!: string;

  @IsString()
  successUrl!: string;

  @IsString()
  cancelUrl!: string;
}

export class SubscriptionCheckoutDto {
  checkoutUrl!: string;
  sessionId!: string;
  accessPlanId!: string;
  amountCents!: number;
  currency!: string;
  billingInterval!: string | null;
}

export class SubscriptionDto {
  id!: string;
  accessPlanId!: string;
  status!: SubscriptionStatus;
  currentPeriodStart!: string;
  currentPeriodEnd!: string;
  canceledAt!: string | null;
  accessPlan!: {
    name: string;
    planType: string;
    courseId: string;
    priceCents: number;
    billingInterval: string | null;
    course: {
      title: string;
      slug: string;
    };
  };
}

export class ListSubscriptionsQueryDto extends PaginationQueryDto {}
