import { Injectable, Logger } from '@nestjs/common';
import {
  AccessPlanType,
  CreatorTransactionType,
  NotificationType,
  PaymentStatus,
  Prisma,
  PurchaseStatus,
  SubscriptionStatus,
} from '@smartklass/database';
import { PrismaService } from '../../common/database/prisma.service';
import { mergeJsonMetadata } from './merge-metadata';
import { MarketplaceAccountingService } from './marketplace-accounting.service';
import Stripe from 'stripe';

type FulfillLifetimeInput = {
  userId: string;
  courseId: string;
  accessPlanId: string;
  paymentId?: string;
  purchaseId?: string;
  stripePaymentIntentId?: string | null;
  stripeCheckoutSessionId?: string;
  stripeChargeId?: string | null;
  amountCents: number;
  currency: string;
  accessDurationDays?: number | null;
};

type FulfillSubscriptionInput = {
  userId: string;
  courseId: string;
  accessPlanId: string;
  stripeSubscriptionId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  canceledAt?: Date | null;
  amountCents?: number;
  currency?: string;
  stripePaymentIntentId?: string | null;
  stripeInvoiceId?: string;
  stripeChargeId?: string | null;
  paymentMetadata?: Prisma.JsonValue | null;
};

@Injectable()
export class BillingFulfillmentService {
  private readonly logger = new Logger(BillingFulfillmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly marketplaceAccounting: MarketplaceAccountingService,
  ) {}

  async fulfillLifetimePurchase(input: FulfillLifetimeInput) {
    return this.prisma.$transaction(async (tx) => {
      const existingPurchase = input.purchaseId
        ? await tx.userPurchase.findUnique({
            where: { id: input.purchaseId },
            include: { courseAccess: true },
          })
        : await tx.userPurchase.findFirst({
            where: {
              userId: input.userId,
              courseId: input.courseId,
              accessPlanId: input.accessPlanId,
              status: PurchaseStatus.COMPLETED,
              deletedAt: null,
            },
            include: { courseAccess: true },
          });

      if (existingPurchase?.status === PurchaseStatus.COMPLETED) {
        if (!existingPurchase.courseAccess) {
          await this.createCourseAccessForPurchase(tx, {
            userId: input.userId,
            courseId: input.courseId,
            accessPlanId: input.accessPlanId,
            purchaseId: existingPurchase.id,
            accessDurationDays: input.accessDurationDays,
          });
        }

        return existingPurchase;
      }

      const purchasedAt = new Date();
      const expiresAt = this.resolvePurchaseExpiry(
        purchasedAt,
        input.accessDurationDays,
      );

      let paymentId = input.paymentId;
      let paymentMetadata: Prisma.JsonValue | null = null;

      if (paymentId) {
        const existingPayment = await tx.payment.findUnique({
          where: { id: paymentId },
          select: { metadata: true },
        });
        paymentMetadata = existingPayment?.metadata ?? null;

        await tx.payment.update({
          where: { id: paymentId },
          data: {
            status: PaymentStatus.SUCCEEDED,
            stripePaymentIntentId: input.stripePaymentIntentId ?? undefined,
            stripeChargeId: input.stripeChargeId ?? undefined,
            paidAt: purchasedAt,
            metadata: mergeJsonMetadata(paymentMetadata, {
              checkoutSessionId: input.stripeCheckoutSessionId ?? null,
            }),
          },
        });
      } else {
        const payment = await tx.payment.create({
          data: {
            userId: input.userId,
            status: PaymentStatus.SUCCEEDED,
            amountCents: input.amountCents,
            currency: input.currency,
            stripePaymentIntentId: input.stripePaymentIntentId ?? undefined,
            stripeChargeId: input.stripeChargeId ?? undefined,
            paidAt: purchasedAt,
            metadata: {
              checkoutSessionId: input.stripeCheckoutSessionId,
            },
          },
        });
        paymentId = payment.id;
        paymentMetadata = payment.metadata;
      }

      let purchase;

      if (input.purchaseId) {
        purchase = await tx.userPurchase.update({
          where: { id: input.purchaseId },
          data: {
            paymentId,
            status: PurchaseStatus.COMPLETED,
            purchasedAt,
            expiresAt,
          },
        });
      } else {
        purchase = await tx.userPurchase.create({
          data: {
            userId: input.userId,
            courseId: input.courseId,
            accessPlanId: input.accessPlanId,
            paymentId,
            status: PurchaseStatus.COMPLETED,
            amountCents: input.amountCents,
            currency: input.currency,
            purchasedAt,
            expiresAt,
          },
        });
      }

      await this.createCourseAccessForPurchase(tx, {
        userId: input.userId,
        courseId: input.courseId,
        accessPlanId: input.accessPlanId,
        purchaseId: purchase.id,
        accessDurationDays: input.accessDurationDays,
        startsAt: purchasedAt,
        expiresAt,
      });

      await this.createPurchaseNotification(tx, {
        userId: input.userId,
        courseId: input.courseId,
        accessPlanId: input.accessPlanId,
      });

      const course = await tx.course.findUnique({
        where: { id: input.courseId },
        select: { creatorProfileId: true },
      });

      if (course && paymentId) {
        await this.marketplaceAccounting.recordSaleFromPaymentMetadata(tx, {
          paymentId,
          creatorProfileId: course.creatorProfileId,
          courseId: input.courseId,
          accessPlanId: input.accessPlanId,
          userId: input.userId,
          type: CreatorTransactionType.ONE_TIME_PURCHASE,
          grossAmountCents: input.amountCents,
          currency: input.currency,
          metadata: paymentMetadata,
          paidAt: purchasedAt,
          stripePaymentIntentId: input.stripePaymentIntentId,
          stripeChargeId: input.stripeChargeId,
        });
      }

      this.logger.log(
        `Granted lifetime access for user ${input.userId} on course ${input.courseId}`,
      );

      return purchase;
    });
  }

  async fulfillSubscription(input: FulfillSubscriptionInput) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.userSubscription.findFirst({
        where: {
          stripeSubscriptionId: input.stripeSubscriptionId,
          deletedAt: null,
        },
        include: {
          courseAccess: true,
          accessPlan: {
            include: {
              course: true,
            },
          },
        },
      });

      if (existing) {
        const subscription = await tx.userSubscription.update({
          where: { id: existing.id },
          data: {
            status: input.status,
            currentPeriodStart: input.currentPeriodStart,
            currentPeriodEnd: input.currentPeriodEnd,
            canceledAt: input.canceledAt ?? null,
          },
        });

        await this.syncSubscriptionCourseAccess(tx, {
          userId: subscription.userId,
          courseId: input.courseId,
          accessPlanId: input.accessPlanId,
          subscriptionId: subscription.id,
          currentPeriodStart: input.currentPeriodStart,
          currentPeriodEnd: input.currentPeriodEnd,
          status: input.status,
        });

        return subscription;
      }

      const subscription = await tx.userSubscription.create({
        data: {
          userId: input.userId,
          accessPlanId: input.accessPlanId,
          status: input.status,
          stripeSubscriptionId: input.stripeSubscriptionId,
          currentPeriodStart: input.currentPeriodStart,
          currentPeriodEnd: input.currentPeriodEnd,
          canceledAt: input.canceledAt ?? null,
        },
      });

      if (input.amountCents && input.currency && input.stripePaymentIntentId) {
        const existingPayment = await tx.payment.findFirst({
          where: { stripePaymentIntentId: input.stripePaymentIntentId },
        });

        if (!existingPayment) {
          const payment = await tx.payment.create({
            data: {
              userId: input.userId,
              status: PaymentStatus.SUCCEEDED,
              amountCents: input.amountCents,
              currency: input.currency,
              stripePaymentIntentId: input.stripePaymentIntentId,
              stripeChargeId: input.stripeChargeId ?? undefined,
              paidAt: new Date(),
              metadata: mergeJsonMetadata(input.paymentMetadata, {
                stripeInvoiceId: input.stripeInvoiceId ?? null,
                stripeSubscriptionId: input.stripeSubscriptionId,
                accessPlanId: input.accessPlanId,
                courseId: input.courseId,
              }),
            },
          });

          const course = await tx.course.findUnique({
            where: { id: input.courseId },
            select: { creatorProfileId: true },
          });

          if (course) {
            await this.marketplaceAccounting.recordSaleFromPaymentMetadata(tx, {
              paymentId: payment.id,
              creatorProfileId: course.creatorProfileId,
              courseId: input.courseId,
              accessPlanId: input.accessPlanId,
              userId: input.userId,
              type: CreatorTransactionType.SUBSCRIPTION_CHARGE,
              grossAmountCents: input.amountCents,
              currency: input.currency,
              metadata: payment.metadata,
              stripePaymentIntentId: input.stripePaymentIntentId,
              stripeChargeId: input.stripeChargeId,
              stripeInvoiceId: input.stripeInvoiceId,
            });
          }
        }
      }

      await this.syncSubscriptionCourseAccess(tx, {
        userId: input.userId,
        courseId: input.courseId,
        accessPlanId: input.accessPlanId,
        subscriptionId: subscription.id,
        currentPeriodStart: input.currentPeriodStart,
        currentPeriodEnd: input.currentPeriodEnd,
        status: input.status,
      });

      await this.createSubscriptionNotification(tx, {
        userId: input.userId,
        courseId: input.courseId,
        accessPlanId: input.accessPlanId,
        type: NotificationType.SUBSCRIPTION_RENEWED,
        title: 'Subscription activated',
        body: 'Your subscription is now active.',
      });

      await this.createCreatorNewSubscriberNotification(tx, {
        subscriberUserId: input.userId,
        courseId: input.courseId,
        accessPlanId: input.accessPlanId,
      });

      this.logger.log(
        `Granted subscription access for user ${input.userId} on course ${input.courseId}`,
      );

      return subscription;
    });
  }

  async revokeSubscriptionAccess(stripeSubscriptionId: string) {
    return this.prisma.$transaction(async (tx) => {
      const subscription = await tx.userSubscription.findFirst({
        where: {
          stripeSubscriptionId,
          deletedAt: null,
        },
      });

      if (!subscription) {
        return null;
      }

      await tx.userSubscription.update({
        where: { id: subscription.id },
        data: {
          status: SubscriptionStatus.CANCELED,
          canceledAt: subscription.canceledAt ?? new Date(),
        },
      });

      await tx.courseAccess.updateMany({
        where: {
          userSubscriptionId: subscription.id,
          revokedAt: null,
          deletedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });

      const accessPlan = await tx.accessPlan.findUnique({
        where: { id: subscription.accessPlanId },
      });

      if (accessPlan) {
        await this.createSubscriptionNotification(tx, {
          userId: subscription.userId,
          courseId: accessPlan.courseId,
          accessPlanId: subscription.accessPlanId,
          type: NotificationType.SUBSCRIPTION_CANCELED,
          title: 'Subscription ended',
          body: 'Your subscription access has ended.',
        });
      }

      return subscription;
    });
  }

  async markSubscriptionPastDue(stripeSubscriptionId: string) {
    const subscription = await this.prisma.userSubscription.findFirst({
      where: {
        stripeSubscriptionId,
        deletedAt: null,
      },
    });

    if (!subscription) {
      return null;
    }

    return this.prisma.userSubscription.update({
      where: { id: subscription.id },
      data: {
        status: SubscriptionStatus.PAST_DUE,
      },
    });
  }

  mapStripeSubscriptionStatus(
    status: Stripe.Subscription.Status,
  ): SubscriptionStatus {
    switch (status) {
      case 'active':
        return SubscriptionStatus.ACTIVE;
      case 'trialing':
        return SubscriptionStatus.TRIALING;
      case 'past_due':
        return SubscriptionStatus.PAST_DUE;
      case 'canceled':
        return SubscriptionStatus.CANCELED;
      case 'paused':
        return SubscriptionStatus.PAUSED;
      case 'unpaid':
      case 'incomplete':
      case 'incomplete_expired':
        return SubscriptionStatus.EXPIRED;
      default:
        return SubscriptionStatus.EXPIRED;
    }
  }

  async fulfillOwnerSelfSubscribe(input: {
    userId: string;
    courseId: string;
    accessPlanId: string;
    planType: AccessPlanType;
    accessDurationDays?: number | null;
    currency: string;
  }): Promise<{ alreadySubscribed: boolean }> {
    const now = new Date();

    const existingGrant = await this.prisma.courseAccess.findFirst({
      where: {
        userId: input.userId,
        courseId: input.courseId,
        accessPlanId: input.accessPlanId,
        deletedAt: null,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    });

    if (existingGrant) {
      return { alreadySubscribed: true };
    }

    if (input.planType === AccessPlanType.SUBSCRIPTION) {
      const periodEnd = new Date(now);
      periodEnd.setFullYear(periodEnd.getFullYear() + 10);

      await this.prisma.$transaction(async (tx) => {
        const subscription = await tx.userSubscription.create({
          data: {
            userId: input.userId,
            accessPlanId: input.accessPlanId,
            status: SubscriptionStatus.ACTIVE,
            stripeSubscriptionId: `owner_self_${input.userId}_${input.accessPlanId}`,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
          },
        });

        await tx.courseAccess.create({
          data: {
            userId: input.userId,
            courseId: input.courseId,
            accessPlanId: input.accessPlanId,
            userSubscriptionId: subscription.id,
            startsAt: now,
            expiresAt: periodEnd,
          },
        });

        await this.createSubscriptionNotification(tx, {
          userId: input.userId,
          courseId: input.courseId,
          accessPlanId: input.accessPlanId,
          type: NotificationType.SUBSCRIPTION_RENEWED,
          title: 'Subscription activated',
          body: 'You subscribed to your course for preview testing.',
        });
      });

      this.logger.log(
        `Granted owner self-subscription for user ${input.userId} on course ${input.courseId}`,
      );

      return { alreadySubscribed: false };
    }

    const purchasedAt = now;
    const expiresAt = this.resolvePurchaseExpiry(
      purchasedAt,
      input.accessDurationDays,
    );

    await this.prisma.$transaction(async (tx) => {
      const purchase = await tx.userPurchase.create({
        data: {
          userId: input.userId,
          courseId: input.courseId,
          accessPlanId: input.accessPlanId,
          status: PurchaseStatus.COMPLETED,
          amountCents: 0,
          currency: input.currency,
          purchasedAt,
          expiresAt,
        },
      });

      await this.createCourseAccessForPurchase(tx, {
        userId: input.userId,
        courseId: input.courseId,
        accessPlanId: input.accessPlanId,
        purchaseId: purchase.id,
        accessDurationDays: input.accessDurationDays,
        startsAt: purchasedAt,
        expiresAt,
      });

      await this.createPurchaseNotification(tx, {
        userId: input.userId,
        courseId: input.courseId,
        accessPlanId: input.accessPlanId,
      });
    });

    this.logger.log(
      `Granted owner self-subscribe access for user ${input.userId} on course ${input.courseId}`,
    );

    return { alreadySubscribed: false };
  }

  private async createCourseAccessForPurchase(
    tx: Prisma.TransactionClient,
    input: {
      userId: string;
      courseId: string;
      accessPlanId: string;
      purchaseId: string;
      accessDurationDays?: number | null;
      startsAt?: Date;
      expiresAt?: Date | null;
    },
  ) {
    const existing = await tx.courseAccess.findFirst({
      where: {
        userPurchaseId: input.purchaseId,
        deletedAt: null,
      },
    });

    if (existing) {
      return existing;
    }

    const startsAt = input.startsAt ?? new Date();
    const expiresAt =
      input.expiresAt ??
      this.resolvePurchaseExpiry(startsAt, input.accessDurationDays);

    return tx.courseAccess.create({
      data: {
        userId: input.userId,
        courseId: input.courseId,
        accessPlanId: input.accessPlanId,
        userPurchaseId: input.purchaseId,
        startsAt,
        expiresAt,
      },
    });
  }

  private async syncSubscriptionCourseAccess(
    tx: Prisma.TransactionClient,
    input: {
      userId: string;
      courseId: string;
      accessPlanId: string;
      subscriptionId: string;
      currentPeriodStart: Date;
      currentPeriodEnd: Date;
      status: SubscriptionStatus;
    },
  ) {
    const activeStatuses: SubscriptionStatus[] = [
      SubscriptionStatus.ACTIVE,
      SubscriptionStatus.TRIALING,
    ];

    const existing = await tx.courseAccess.findFirst({
      where: {
        userSubscriptionId: input.subscriptionId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeStatuses.includes(input.status)) {
      if (existing && !existing.revokedAt) {
        await tx.courseAccess.update({
          where: { id: existing.id },
          data: { revokedAt: new Date() },
        });
      }

      return existing;
    }

    if (existing) {
      return tx.courseAccess.update({
        where: { id: existing.id },
        data: {
          startsAt: input.currentPeriodStart,
          expiresAt: input.currentPeriodEnd,
          revokedAt: null,
        },
      });
    }

    return tx.courseAccess.create({
      data: {
        userId: input.userId,
        courseId: input.courseId,
        accessPlanId: input.accessPlanId,
        userSubscriptionId: input.subscriptionId,
        startsAt: input.currentPeriodStart,
        expiresAt: input.currentPeriodEnd,
      },
    });
  }

  private resolvePurchaseExpiry(
    startsAt: Date,
    accessDurationDays?: number | null,
  ): Date | null {
    if (!accessDurationDays) {
      return null;
    }

    const expiresAt = new Date(startsAt);
    expiresAt.setDate(expiresAt.getDate() + accessDurationDays);
    return expiresAt;
  }

  private async createPurchaseNotification(
    tx: Prisma.TransactionClient,
    input: {
      userId: string;
      courseId: string;
      accessPlanId: string;
    },
  ) {
    const course = await tx.course.findUnique({
      where: { id: input.courseId },
      select: { title: true },
    });

    const existing = await tx.notification.findFirst({
      where: {
        userId: input.userId,
        type: NotificationType.PURCHASE_CONFIRMED,
      },
    });

    if (existing) {
      return existing;
    }

    return tx.notification.create({
      data: {
        userId: input.userId,
        type: NotificationType.PURCHASE_CONFIRMED,
        title: 'Purchase confirmed',
        body: course
          ? `You now have access to "${course.title}".`
          : 'Your purchase is confirmed.',
        data: {
          courseId: input.courseId,
          accessPlanId: input.accessPlanId,
        },
      },
    });
  }

  private async createSubscriptionNotification(
    tx: Prisma.TransactionClient,
    input: {
      userId: string;
      courseId: string;
      accessPlanId: string;
      type: NotificationType;
      title: string;
      body: string;
    },
  ) {
    return tx.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        data: {
          courseId: input.courseId,
          accessPlanId: input.accessPlanId,
        },
      },
    });
  }

  private async createCreatorNewSubscriberNotification(
    tx: Prisma.TransactionClient,
    input: {
      subscriberUserId: string;
      courseId: string;
      accessPlanId: string;
    },
  ) {
    const course = await tx.course.findUnique({
      where: { id: input.courseId },
      select: {
        title: true,
        creatorProfile: {
          select: { userId: true },
        },
      },
    });

    if (!course?.creatorProfile) {
      return null;
    }

    const subscriber = await tx.userProfile.findUnique({
      where: { userId: input.subscriberUserId },
      select: { displayName: true },
    });

    const subscriberName = subscriber?.displayName ?? 'A learner';

    return tx.notification.create({
      data: {
        userId: course.creatorProfile.userId,
        type: NotificationType.NEW_SUBSCRIBER,
        title: 'New subscriber',
        body: `${subscriberName} subscribed to "${course.title}".`,
        data: {
          courseId: input.courseId,
          accessPlanId: input.accessPlanId,
          subscriberUserId: input.subscriberUserId,
        },
      },
    });
  }
}
