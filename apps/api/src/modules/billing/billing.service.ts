import { Injectable } from '@nestjs/common';
import { PurchaseStatus, SubscriptionStatus } from '@smartklass/database';
import { PrismaService } from '../../common/database/prisma.service';
import {
  BillingMeDto,
  BillingPaymentDto,
  BillingPurchaseDto,
  BillingSubscriptionDto,
} from './dto/billing.dto';

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  async getBillingOverview(userId: string): Promise<BillingMeDto> {
    const [payments, purchases, subscriptions] = await Promise.all([
      this.prisma.payment.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.userPurchase.findMany({
        where: {
          userId,
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          course: {
            select: {
              slug: true,
              title: true,
            },
          },
          accessPlan: {
            select: {
              name: true,
              planType: true,
            },
          },
        },
      }),
      this.prisma.userSubscription.findMany({
        where: {
          userId,
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          accessPlan: {
            select: {
              name: true,
              planType: true,
              billingInterval: true,
              courseId: true,
              course: {
                select: {
                  slug: true,
                  title: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const activeStatuses = [
      SubscriptionStatus.ACTIVE,
      SubscriptionStatus.TRIALING,
    ] as const;

    const activeSubscriptions = subscriptions.filter((subscription) =>
      (activeStatuses as readonly SubscriptionStatus[]).includes(
        subscription.status,
      ),
    ).length;

    const completedPurchases = purchases.filter(
      (purchase) => purchase.status === PurchaseStatus.COMPLETED,
    ).length;

    return {
      payments: payments.map((payment) => this.toPaymentDto(payment)),
      purchases: purchases.map((purchase) => this.toPurchaseDto(purchase)),
      subscriptions: subscriptions.map((subscription) =>
        this.toSubscriptionDto(subscription),
      ),
      summary: {
        totalPayments: payments.length,
        completedPurchases,
        activeSubscriptions,
      },
    };
  }

  private toPaymentDto(payment: {
    id: string;
    status: BillingPaymentDto['status'];
    amountCents: number;
    currency: string;
    paidAt: Date | null;
    createdAt: Date;
  }): BillingPaymentDto {
    return {
      id: payment.id,
      status: payment.status,
      amountCents: payment.amountCents,
      currency: payment.currency,
      paidAt: payment.paidAt?.toISOString() ?? null,
      createdAt: payment.createdAt.toISOString(),
    };
  }

  private toPurchaseDto(purchase: {
    id: string;
    courseId: string;
    accessPlanId: string;
    status: BillingPurchaseDto['status'];
    amountCents: number;
    currency: string;
    purchasedAt: Date | null;
    expiresAt: Date | null;
    course: {
      slug: string;
      title: string;
    };
    accessPlan: {
      name: string;
      planType: string;
    };
  }): BillingPurchaseDto {
    return {
      id: purchase.id,
      courseId: purchase.courseId,
      accessPlanId: purchase.accessPlanId,
      status: purchase.status,
      amountCents: purchase.amountCents,
      currency: purchase.currency,
      purchasedAt: purchase.purchasedAt?.toISOString() ?? null,
      expiresAt: purchase.expiresAt?.toISOString() ?? null,
      course: purchase.course,
      accessPlan: purchase.accessPlan,
    };
  }

  private toSubscriptionDto(subscription: {
    id: string;
    accessPlanId: string;
    status: BillingSubscriptionDto['status'];
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    canceledAt: Date | null;
    accessPlan: {
      name: string;
      planType: string;
      billingInterval: string | null;
      courseId: string;
      course: {
        slug: string;
        title: string;
      };
    };
  }): BillingSubscriptionDto {
    return {
      id: subscription.id,
      accessPlanId: subscription.accessPlanId,
      status: subscription.status,
      currentPeriodStart: subscription.currentPeriodStart.toISOString(),
      currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
      canceledAt: subscription.canceledAt?.toISOString() ?? null,
      accessPlan: subscription.accessPlan,
    };
  }
}
