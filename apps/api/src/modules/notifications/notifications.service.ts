import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Notification, Prisma } from '@smartklass/database';
import { PaginatedResultDto } from '../../common/dto/pagination.dto';
import { AuthenticatedUser } from '../../common/auth/interfaces/authenticated-user.interface';
import { PrismaService } from '../../common/database/prisma.service';
import {
  ListNotificationsQueryDto,
  NotificationDto,
  NotificationsListResultDto,
} from './dto/notification.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listMine(
    user: AuthenticatedUser,
    query: ListNotificationsQueryDto,
  ): Promise<NotificationsListResultDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {
      userId: user.id,
      deletedAt: null,
    };

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: {
          ...where,
          readAt: null,
        },
      }),
    ]);

    return {
      items: notifications.map((notification) => this.toNotificationDto(notification)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
      unreadCount,
    };
  }

  async markRead(
    user: AuthenticatedUser,
    id: string,
  ): Promise<NotificationDto> {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id,
        userId: user.id,
        deletedAt: null,
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found.');
    }

    if (notification.readAt) {
      return this.toNotificationDto(notification);
    }

    const updated = await this.prisma.notification.update({
      where: { id: notification.id },
      data: { readAt: new Date() },
    });

    return this.toNotificationDto(updated);
  }

  async markAllRead(user: AuthenticatedUser): Promise<{ updatedCount: number }> {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId: user.id,
        readAt: null,
        deletedAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    return { updatedCount: result.count };
  }

  private toNotificationDto(notification: Notification): NotificationDto {
    return {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      data: this.toRecord(notification.data),
      readAt: notification.readAt?.toISOString() ?? null,
      createdAt: notification.createdAt.toISOString(),
    };
  }

  private toRecord(
    value: Prisma.JsonValue | null,
  ): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    return value as Record<string, unknown>;
  }
}
