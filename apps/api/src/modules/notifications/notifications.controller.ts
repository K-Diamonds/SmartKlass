import { Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/auth';
import type { AuthenticatedUser } from '../../common/auth/interfaces/authenticated-user.interface';
import { IdParamDto } from '../../common/dto/pagination.dto';
import {
  ListNotificationsQueryDto,
  NotificationDto,
  NotificationsListResultDto,
} from './dto/notification.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('me')
  listMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListNotificationsQueryDto,
  ): Promise<NotificationsListResultDto> {
    return this.notificationsService.listMine(user, query);
  }

  @Patch(':id/read')
  markRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: IdParamDto,
  ): Promise<NotificationDto> {
    return this.notificationsService.markRead(user, params.id);
  }

  @Post('read-all')
  markAllRead(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ updatedCount: number }> {
    return this.notificationsService.markAllRead(user);
  }
}
