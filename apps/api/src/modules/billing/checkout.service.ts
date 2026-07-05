import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AccessPlanType,
  BillingInterval,
  CourseStatus,
  PaymentStatus,
  PurchaseStatus,
} from '@smartklass/database';
import {
  CERTIFICATE_ENABLEMENT_FEE_CENTS,
  calculatePlatformFee,
  connectApplicationFeePercent,
} from '@smartklass/shared';
import { PrismaService } from '../../common/database/prisma.service';
import { mergeJsonMetadata } from './merge-metadata';
import {
  CertificateCheckoutDto,
  CoursePlanCheckoutDto,
  CreateCertificateCheckoutDto,
  CreateCoursePlanCheckoutDto,
  OwnerSelfSubscribeResultDto,
} from './dto/billing.dto';
import { BillingFulfillmentService } from './billing-fulfillment.service';
import { CreatorBillingService } from './creator-billing.service';
import { StripeClientService } from './stripe-client.service';

@Injectable()
export class CheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeClient: StripeClientService,
    private readonly fulfillment: BillingFulfillmentService,
    private readonly creatorBilling: CreatorBillingService,
  ) {}

  async createCoursePlanCheckout(
    userId: string,
    dto: CreateCoursePlanCheckoutDto,
  ): Promise<CoursePlanCheckoutDto> {
    const accessPlan = await this.prisma.accessPlan.findFirst({
      where: {
        id: dto.accessPlanId,
        deletedAt: null,
        isActive: true,
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            deletedAt: true,
            status: true,
            creatorProfileId: true,
          },
        },
      },
    });

    if (!accessPlan) {
      throw new NotFoundException('Access plan not found.');
    }

    if (accessPlan.planType === AccessPlanType.FREE) {
      throw new BadRequestException('Free plans do not require checkout.');
    }

    if (accessPlan.priceCents <= 0) {
      throw new BadRequestException('This plan is not available for purchase.');
    }

    if (
      accessPlan.course.deletedAt ||
      accessPlan.course.status !== CourseStatus.PUBLISHED
    ) {
      throw new BadRequestException(
        'This course is not available for purchase.',
      );
    }

    if (accessPlan.planType === AccessPlanType.SUBSCRIPTION) {
      if (
        !accessPlan.billingInterval ||
        ![
          BillingInterval.WEEKLY,
          BillingInterval.MONTHLY,
          BillingInterval.YEARLY,
        ].includes(accessPlan.billingInterval)
      ) {
        throw new BadRequestException(
          'Subscription plans must have a weekly, monthly, or yearly billing interval.',
        );
      }
    }

    const stripe = this.stripeClient.getClient();
    const stripePriceId = await this.ensureStripePrice(accessPlan);
    const feeBreakdown = calculatePlatformFee(accessPlan.priceCents);
    const destinationAccountId =
      await this.creatorBilling.getConnectDestinationForCourse(
        accessPlan.course.creatorProfileId,
      );

    const isSubscription = accessPlan.planType === AccessPlanType.SUBSCRIPTION;
    const metadata = {
      userId,
      accessPlanId: accessPlan.id,
      courseId: accessPlan.courseId,
      planType: accessPlan.planType,
      platformFeeCents: String(feeBreakdown.platformFeeCents),
      creatorNetCents: String(feeBreakdown.creatorEarningsCents),
      creatorEarningsCents: String(feeBreakdown.creatorEarningsCents),
      feeRuleLabel: feeBreakdown.feeRuleLabel,
    };

    let paymentId: string | undefined;
    let purchaseId: string | undefined;

    if (!isSubscription) {
      const pending = await this.prisma.$transaction(async (tx) => {
        const payment = await tx.payment.create({
          data: {
            userId,
            status: PaymentStatus.PENDING,
            amountCents: accessPlan.priceCents,
            currency: accessPlan.currency,
            metadata: {
              accessPlanId: accessPlan.id,
              courseId: accessPlan.courseId,
              platformFeeCents: feeBreakdown.platformFeeCents,
              creatorNetCents: feeBreakdown.creatorEarningsCents,
              creatorEarningsCents: feeBreakdown.creatorEarningsCents,
              feeRuleLabel: feeBreakdown.feeRuleLabel,
            },
          },
        });

        const purchase = await tx.userPurchase.create({
          data: {
            userId,
            courseId: accessPlan.courseId,
            accessPlanId: accessPlan.id,
            paymentId: payment.id,
            status: PurchaseStatus.PENDING,
            amountCents: accessPlan.priceCents,
            currency: accessPlan.currency,
          },
        });

        return { payment, purchase };
      });

      paymentId = pending.payment.id;
      purchaseId = pending.purchase.id;
    }

    const session = await stripe.checkout.sessions.create({
      mode: isSubscription ? 'subscription' : 'payment',
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      success_url: dto.successUrl,
      cancel_url: dto.cancelUrl,
      client_reference_id: userId,
      metadata: {
        ...metadata,
        ...(paymentId ? { paymentId } : {}),
        ...(purchaseId ? { purchaseId } : {}),
        stripeConnectAccountId: destinationAccountId,
      },
      ...(isSubscription
        ? {
            subscription_data: {
              metadata,
              transfer_data: {
                destination: destinationAccountId,
              },
              application_fee_percent: connectApplicationFeePercent(
                accessPlan.priceCents,
                feeBreakdown.platformFeeCents,
              ),
            },
          }
        : {
            payment_intent_data: {
              application_fee_amount: feeBreakdown.platformFeeCents,
              transfer_data: {
                destination: destinationAccountId,
              },
              metadata,
            },
          }),
    });

    if (!session.url) {
      throw new BadRequestException(
        'Stripe checkout session could not be created.',
      );
    }

    if (paymentId) {
      const existingPayment = await this.prisma.payment.findUnique({
        where: { id: paymentId },
        select: { metadata: true },
      });

      await this.prisma.payment.update({
        where: { id: paymentId },
        data: {
          metadata: mergeJsonMetadata(existingPayment?.metadata, {
            accessPlanId: accessPlan.id,
            courseId: accessPlan.courseId,
            checkoutSessionId: session.id,
            purchaseId: purchaseId ?? null,
            platformFeeCents: feeBreakdown.platformFeeCents,
            creatorNetCents: feeBreakdown.creatorEarningsCents,
            creatorEarningsCents: feeBreakdown.creatorEarningsCents,
            feeRuleLabel: feeBreakdown.feeRuleLabel,
            stripeConnectAccountId: destinationAccountId,
          }),
        },
      });
    }

    return {
      checkoutUrl: session.url,
      sessionId: session.id,
      accessPlanId: accessPlan.id,
      courseId: accessPlan.courseId,
      planType: accessPlan.planType,
      amountCents: accessPlan.priceCents,
      currency: accessPlan.currency,
      billingInterval: accessPlan.billingInterval,
      platformFeeCents: feeBreakdown.platformFeeCents,
      creatorEarningsCents: feeBreakdown.creatorEarningsCents,
    };
  }

  async ownerSelfSubscribe(
    userId: string,
    accessPlanId: string,
  ): Promise<OwnerSelfSubscribeResultDto> {
    const accessPlan = await this.prisma.accessPlan.findFirst({
      where: {
        id: accessPlanId,
        deletedAt: null,
        isActive: true,
      },
      include: {
        course: {
          include: {
            creatorProfile: {
              select: {
                userId: true,
                deletedAt: true,
              },
            },
          },
        },
      },
    });

    if (!accessPlan) {
      throw new NotFoundException('Access plan not found.');
    }

    if (accessPlan.course.deletedAt) {
      throw new BadRequestException('This course is not available.');
    }

    const creatorProfile = accessPlan.course.creatorProfile;

    if (!creatorProfile || creatorProfile.deletedAt) {
      throw new BadRequestException('This course is not available.');
    }

    if (creatorProfile.userId !== userId) {
      throw new ForbiddenException(
        'Only the course owner can subscribe to their own course this way.',
      );
    }

    if (
      accessPlan.planType === AccessPlanType.SUBSCRIPTION &&
      (!accessPlan.billingInterval ||
        ![
          BillingInterval.WEEKLY,
          BillingInterval.MONTHLY,
          BillingInterval.YEARLY,
        ].includes(accessPlan.billingInterval))
    ) {
      throw new BadRequestException(
        'Subscription plans must have a weekly, monthly, or yearly billing interval.',
      );
    }

    const result = await this.fulfillment.fulfillOwnerSelfSubscribe({
      userId,
      courseId: accessPlan.courseId,
      accessPlanId: accessPlan.id,
      planType: accessPlan.planType,
      accessDurationDays: accessPlan.accessDurationDays,
      currency: accessPlan.currency,
    });

    return {
      courseId: accessPlan.courseId,
      accessPlanId: accessPlan.id,
      alreadySubscribed: result.alreadySubscribed,
    };
  }

  async createCertificateCheckout(
    userId: string,
    creatorProfileId: string,
    dto: CreateCertificateCheckoutDto,
  ): Promise<CertificateCheckoutDto> {
    const course = await this.prisma.course.findFirst({
      where: {
        id: dto.courseId,
        creatorProfileId,
        deletedAt: null,
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found.');
    }

    if (course.offersCertificate) {
      throw new BadRequestException('Certificate is already enabled for this course.');
    }

    const stripe = this.stripeClient.getClient();

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: CERTIFICATE_ENABLEMENT_FEE_CENTS,
            product_data: {
              name: `Certificate enablement — ${course.title}`,
              metadata: {
                courseId: course.id,
              },
            },
          },
          quantity: 1,
        },
      ],
      success_url: dto.successUrl,
      cancel_url: dto.cancelUrl,
      client_reference_id: userId,
      metadata: {
        purpose: 'certificate_enablement',
        userId,
        creatorProfileId,
        courseId: course.id,
      },
    });

    if (!session.url) {
      throw new BadRequestException(
        'Stripe checkout session could not be created.',
      );
    }

    return {
      checkoutUrl: session.url,
      sessionId: session.id,
      courseId: course.id,
      amountCents: CERTIFICATE_ENABLEMENT_FEE_CENTS,
      currency: 'USD',
    };
  }

  private async ensureStripePrice(accessPlan: {
    id: string;
    name: string;
    priceCents: number;
    currency: string;
    planType: AccessPlanType;
    billingInterval: BillingInterval | null;
    stripePriceId: string | null;
    course: {
      id: string;
      title: string;
    };
  }): Promise<string> {
    if (accessPlan.stripePriceId) {
      return accessPlan.stripePriceId;
    }

    const stripe = this.stripeClient.getClient();

    const product = await stripe.products.create({
      name: `${accessPlan.course.title} — ${accessPlan.name}`,
      metadata: {
        courseId: accessPlan.course.id,
        accessPlanId: accessPlan.id,
      },
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: accessPlan.priceCents,
      currency: accessPlan.currency.toLowerCase(),
      ...(accessPlan.planType === AccessPlanType.SUBSCRIPTION
        ? {
            recurring: {
              interval: this.stripeRecurringInterval(accessPlan.billingInterval!),
            },
          }
        : {}),
      metadata: {
        courseId: accessPlan.course.id,
        accessPlanId: accessPlan.id,
      },
    });

    await this.prisma.accessPlan.update({
      where: { id: accessPlan.id },
      data: { stripePriceId: price.id },
    });

    return price.id;
  }

  private stripeRecurringInterval(
    billingInterval: BillingInterval,
  ): 'week' | 'month' | 'year' {
    switch (billingInterval) {
      case BillingInterval.WEEKLY:
        return 'week';
      case BillingInterval.YEARLY:
        return 'year';
      default:
        return 'month';
    }
  }
}
