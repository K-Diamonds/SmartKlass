import { PaymentStatus } from '@smartklass/database';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class PaymentDto {
  id!: string;
  status!: PaymentStatus;
  amountCents!: number;
  currency!: string;
  paidAt!: string | null;
  createdAt!: string;
}

export class ListPaymentsQueryDto extends PaginationQueryDto {}

export class StripeWebhookDto {
  @IsOptional()
  @IsString()
  type?: string;
}

export class StripeWebhookResponseDto {
  received!: boolean;
  message!: string;
}
