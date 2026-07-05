import { Controller, Get, Param, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/auth';
import type { AuthenticatedUser } from '../../common/auth/interfaces/authenticated-user.interface';
import {
  IdParamDto,
  PaginatedResultDto,
} from '../../common/dto/pagination.dto';
import { ListPurchasesQueryDto, PurchaseDto } from './dto/purchase.dto';
import { PurchasesService } from './purchases.service';

@Controller('purchases')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Get('me')
  listMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListPurchasesQueryDto,
  ): Promise<PaginatedResultDto<PurchaseDto>> {
    return this.purchasesService.listMine(user.id, query);
  }

  @Get(':id')
  getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: IdParamDto,
  ): Promise<PurchaseDto> {
    return this.purchasesService.getById(user.id, params.id);
  }
}
