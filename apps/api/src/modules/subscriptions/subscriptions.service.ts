import { Injectable, NotFoundException } from '@nestjs/common';
import { PaginatedResultDto } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../common/database/prisma.service';
import {
  ListSubscriptionsQueryDto,
  SubscriptionDto,
} from './dto/subscription.dto';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async listMine(
    userId: string,
    query: ListSubscriptionsQueryDto,
  ): Promise<PaginatedResultDto<SubscriptionDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = {
      userId,
      deletedAt: null,
    };

    const [items, total] = await Promise.all([
      this.prisma.userSubscription.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          accessPlan: {
            select: {
              name: true,
              planType: true,
              courseId: true,
              priceCents: true,
              billingInterval: true,
              course: {
                select: {
                  title: true,
                  slug: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.userSubscription.count({ where }),
    ]);

    return {
      items: items.map((subscription) => ({
        id: subscription.id,
        accessPlanId: subscription.accessPlanId,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart.toISOString(),
        currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
        canceledAt: subscription.canceledAt?.toISOString() ?? null,
        accessPlan: subscription.accessPlan,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async cancel(userId: string, id: string): Promise<SubscriptionDto> {
    const subscription = await this.prisma.userSubscription.findFirst({
      where: {
        id,
        userId,
        deletedAt: null,
      },
      include: {
        accessPlan: {
          select: {
            name: true,
            planType: true,
            courseId: true,
            priceCents: true,
            billingInterval: true,
            course: {
              select: {
                title: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found.');
    }

    if (!subscription.stripeSubscriptionId) {
      throw new NotFoundException('Subscription is not linked to Stripe.');
    }

    throw new NotFoundException(
      'Subscription cancellation via Stripe will be available in a follow-up.',
    );
  }
}
