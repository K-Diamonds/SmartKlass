import { Injectable } from '@nestjs/common';
import { PaginatedResultDto } from '../../common/dto/pagination.dto';
import { PlaceholderService } from '../../common/services/placeholder.service';
import { ListPaymentsQueryDto, PaymentDto } from './dto/payment.dto';

@Injectable()
export class PaymentsService extends PlaceholderService {
  listMine(
    _query: ListPaymentsQueryDto,
  ): Promise<PaginatedResultDto<PaymentDto>> {
    this.notImplemented(
      'Use GET /billing/me for payment history. Payment detail is not implemented yet.',
    );
  }

  getById(_id: string): Promise<PaymentDto> {
    this.notImplemented('Payment detail');
  }
}
