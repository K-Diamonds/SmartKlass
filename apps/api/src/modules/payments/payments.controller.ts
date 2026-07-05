import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  IdParamDto,
  PaginatedResultDto,
} from '../../common/dto/pagination.dto';
import { ListPaymentsQueryDto, PaymentDto } from './dto/payment.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('me')
  listMine(
    @Query() query: ListPaymentsQueryDto,
  ): Promise<PaginatedResultDto<PaymentDto>> {
    return this.paymentsService.listMine(query);
  }

  @Get(':id')
  getById(@Param() params: IdParamDto): Promise<PaymentDto> {
    return this.paymentsService.getById(params.id);
  }
}
