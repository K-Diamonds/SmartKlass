import { NotificationType } from '@smartklass/database';
import {
  PaginatedResultDto,
  PaginationQueryDto,
} from '../../../common/dto/pagination.dto';

export class NotificationDto {
  id!: string;
  type!: NotificationType;
  title!: string;
  body!: string;
  data!: Record<string, unknown> | null;
  readAt!: string | null;
  createdAt!: string;
}

export class ListNotificationsQueryDto extends PaginationQueryDto {}

export class MarkNotificationReadDto {
  read!: boolean;
}

export class NotificationsListResultDto implements PaginatedResultDto<NotificationDto> {
  items!: NotificationDto[];
  meta!: PaginatedResultDto<NotificationDto>['meta'];
  unreadCount!: number;
}
