import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/auth';
import type { AuthenticatedUser } from '../../common/auth/interfaces/authenticated-user.interface';
import {
  IdParamDto,
  PaginatedResultDto,
} from '../../common/dto/pagination.dto';
import {
  ListSubscriptionsQueryDto,
  SubscriptionDto,
} from './dto/subscription.dto';
import { SubscriptionsService } from './subscriptions.service';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('me')
  listMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListSubscriptionsQueryDto,
  ): Promise<PaginatedResultDto<SubscriptionDto>> {
    return this.subscriptionsService.listMine(user.id, query);
  }

  @Post(':id/cancel')
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: IdParamDto,
  ): Promise<SubscriptionDto> {
    return this.subscriptionsService.cancel(user.id, params.id);
  }
}
