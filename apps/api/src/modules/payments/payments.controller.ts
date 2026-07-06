import { Controller, Get, Param, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/auth';
import type { AuthenticatedUser } from '../../common/auth/interfaces/authenticated-user.interface';
import {
  IdParamDto,
  PaginatedResultDto,
} from '../../common/dto/pagination.dto';
import { ListPaymentsQueryDto, PaymentDetailDto } from './dto/payment.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('me')
  listMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListPaymentsQueryDto,
  ): Promise<PaginatedResultDto<PaymentDetailDto>> {
    return this.paymentsService.listMine(user, query);
  }

  @Get(':id')
  getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: IdParamDto,
  ): Promise<PaymentDetailDto> {
    return this.paymentsService.getById(user, params.id);
  }
}
