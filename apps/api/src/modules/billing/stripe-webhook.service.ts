import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { AccessPlanType, NotificationType } from '@smartklass/database';
import { PrismaService } from '../../common/database/prisma.service';
import { BillingFulfillmentService } from './billing-fulfillment.service';
import { CreatorBillingService } from './creator-billing.service';
import { MarketplaceAccountingService } from './marketplace-accounting.service';
import { StripeWebhookResponseDto } from './dto/billing.dto';
import { StripeClientService } from './stripe-client.service';
import {
  getInvoicePaymentIntentId,
  getSubscriptionIdFromInvoice,
  getSubscriptionPeriod,
  resolveStripeChargeId,
} from './stripe-utils';

@Injectable()
export class StripeWebhookService {
  private readonly logger = new Logger(StripeWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeClient: StripeClientService,
    private readonly fulfillment: BillingFulfillmentService,
    private readonly creatorBilling: CreatorBillingService,
    private readonly marketplaceAccounting: MarketplaceAccountingService,
  ) {}

  async handleWebhook(
    rawBody: Buffer | undefined,
    signature: string | undefined,
  ): Promise<StripeWebhookResponseDto> {
    if (!rawBody) {
      throw new BadRequestException(
        'Missing raw request body for webhook verification.',
      );
    }

    if (!signature) {
      throw new BadRequestException('Missing Stripe signature header.');
    }

    const stripe = this.stripeClient.getClient();
    const webhookSecret = this.stripeClient.getWebhookSecret();

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Invalid webhook signature.';
      throw new BadRequestException(message);
    }

    const alreadyProcessed = await this.prisma.processedStripeEvent.findUnique({
      where: { id: event.id },
    });

    if (alreadyProcessed) {
      return {
        received: true,
        message: `Event ${event.id} already processed.`,
      };
    }

    await this.dispatchEvent(event);

    await this.prisma.processedStripeEvent.create({
      data: {
        id: event.id,
        type: event.type,
      },
    });

    return {
      received: true,
      message: `Processed ${event.type}.`,
    };
  }

  private async dispatchEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutSessionCompleted(event.data.object);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionChanged(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await this.handleInvoicePaymentSucceeded(event.data.object);
        break;
      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object);
        break;
      case 'charge.refunded':
        await this.handleChargeRefunded(event.data.object);
        break;
      case 'refund.created':
      case 'refund.updated':
        await this.marketplaceAccounting.syncRefundFromStripe(event.data.object);
        break;
      case 'charge.dispute.created':
      case 'charge.dispute.updated':
        await this.marketplaceAccounting.syncDisputeFromStripe(event.data.object);
        break;
      case 'charge.dispute.closed':
        await this.marketplaceAccounting.closeDisputeFromStripe(event.data.object);
        break;
      case 'payout.paid':
        if (event.account) {
          await this.marketplaceAccounting.syncPayoutFromStripe(
            event.data.object,
            event.account,
          );
        }
        break;
      case 'payout.failed':
        if (event.account) {
          await this.marketplaceAccounting.syncPayoutFailedFromStripe(
            event.data.object,
            event.account,
          );
        }
        break;
      case 'payout.updated':
        if (event.account) {
          await this.marketplaceAccounting.syncPayoutFromStripe(
            event.data.object,
            event.account,
          );
        }
        break;
      default:
        this.logger.debug(`Ignoring unsupported Stripe event: ${event.type}`);
    }
  }

  private async handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    const metadata = session.metadata ?? {};

    if (metadata.purpose === 'certificate_enablement') {
      const userId = metadata.userId;
      const creatorProfileId = metadata.creatorProfileId;
      const courseId = metadata.courseId;

      if (!userId || !creatorProfileId || !courseId) {
        this.logger.warn(
          `Certificate checkout session ${session.id} is missing required metadata.`,
        );
        return;
      }

      const paymentIntentId =
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id;

      await this.creatorBilling.fulfillCertificateStripePayment({
        userId,
        creatorProfileId,
        courseId,
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId: paymentIntentId,
      });

      return;
    }

    const userId = metadata.userId;
    const accessPlanId = metadata.accessPlanId;
    const courseId = metadata.courseId;
    const planType = metadata.planType;

    if (!userId || !accessPlanId || !courseId || !planType) {
      this.logger.warn(
        `Checkout session ${session.id} is missing required metadata.`,
      );
      return;
    }

    const accessPlan = await this.prisma.accessPlan.findFirst({
      where: {
        id: accessPlanId,
        deletedAt: null,
      },
    });

    if (!accessPlan) {
      this.logger.warn(`Access plan ${accessPlanId} not found for checkout.`);
      return;
    }

    const stripe = this.stripeClient.getClient();

    if (planType === AccessPlanType.ONE_TIME) {
      const stripePaymentIntentId =
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id;
      const stripeChargeId = await resolveStripeChargeId(
        stripe,
        stripePaymentIntentId,
      );

      await this.fulfillment.fulfillLifetimePurchase({
        userId,
        courseId,
        accessPlanId,
        paymentId: metadata.paymentId,
        purchaseId: metadata.purchaseId,
        stripePaymentIntentId,
        stripeChargeId,
        stripeCheckoutSessionId: session.id,
        amountCents: accessPlan.priceCents,
        currency: accessPlan.currency,
        accessDurationDays: accessPlan.accessDurationDays,
      });
      return;
    }

    if (planType === AccessPlanType.SUBSCRIPTION && session.subscription) {
      const subscriptionId =
        typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription.id;
      const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['items.data.price'],
      });
      const period = getSubscriptionPeriod(subscription);

      await this.fulfillment.fulfillSubscription({
        userId,
        courseId,
        accessPlanId,
        stripeSubscriptionId: subscription.id,
        status: this.fulfillment.mapStripeSubscriptionStatus(
          subscription.status,
        ),
        currentPeriodStart: period.currentPeriodStart,
        currentPeriodEnd: period.currentPeriodEnd,
        canceledAt: subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000)
          : null,
      });
    }
  }

  private async handleSubscriptionChanged(
    subscription: Stripe.Subscription,
  ): Promise<void> {
    const metadata = subscription.metadata ?? {};
    const userId = metadata.userId;
    const accessPlanId = metadata.accessPlanId;
    const courseId = metadata.courseId;

    if (!userId || !accessPlanId || !courseId) {
      this.logger.warn(
        `Subscription ${subscription.id} is missing required metadata.`,
      );
      return;
    }

    const period = getSubscriptionPeriod(subscription);

    await this.fulfillment.fulfillSubscription({
      userId,
      courseId,
      accessPlanId,
      stripeSubscriptionId: subscription.id,
      status: this.fulfillment.mapStripeSubscriptionStatus(subscription.status),
      currentPeriodStart: period.currentPeriodStart,
      currentPeriodEnd: period.currentPeriodEnd,
      canceledAt: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000)
        : null,
    });
  }

  private async handleSubscriptionDeleted(
    subscription: Stripe.Subscription,
  ): Promise<void> {
    await this.fulfillment.revokeSubscriptionAccess(subscription.id);
  }

  private async handleInvoicePaymentSucceeded(
    invoice: Stripe.Invoice,
  ): Promise<void> {
    const subscriptionId = getSubscriptionIdFromInvoice(invoice);

    if (!subscriptionId) {
      return;
    }

    const stripe = this.stripeClient.getClient();
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['items.data.price'],
    });
    const metadata = subscription.metadata ?? {};

    if (!metadata.userId || !metadata.accessPlanId || !metadata.courseId) {
      return;
    }

    const period = getSubscriptionPeriod(subscription);
    const stripePaymentIntentId = getInvoicePaymentIntentId(invoice);
    const stripeChargeId = await resolveStripeChargeId(
      stripe,
      stripePaymentIntentId,
    );

    await this.fulfillment.fulfillSubscription({
      userId: metadata.userId,
      courseId: metadata.courseId,
      accessPlanId: metadata.accessPlanId,
      stripeSubscriptionId: subscription.id,
      status: this.fulfillment.mapStripeSubscriptionStatus(subscription.status),
      currentPeriodStart: period.currentPeriodStart,
      currentPeriodEnd: period.currentPeriodEnd,
      canceledAt: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000)
        : null,
      amountCents: invoice.amount_paid ?? undefined,
      currency: invoice.currency?.toUpperCase(),
      stripePaymentIntentId,
      stripeChargeId,
      stripeInvoiceId: invoice.id,
      paymentMetadata: metadata,
    });
  }

  private async handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
    const refunds = charge.refunds?.data ?? [];

    for (const refund of refunds) {
      await this.marketplaceAccounting.syncRefundFromStripe(refund);
    }
  }

  private async handleInvoicePaymentFailed(
    invoice: Stripe.Invoice,
  ): Promise<void> {
    const subscriptionId = getSubscriptionIdFromInvoice(invoice);

    if (!subscriptionId) {
      return;
    }

    await this.fulfillment.markSubscriptionPastDue(subscriptionId);

    const localSubscription = await this.prisma.userSubscription.findFirst({
      where: {
        stripeSubscriptionId: subscriptionId,
        deletedAt: null,
      },
      include: {
        accessPlan: true,
      },
    });

    if (!localSubscription) {
      return;
    }

    await this.prisma.notification.create({
      data: {
        userId: localSubscription.userId,
        type: NotificationType.SYSTEM,
        title: 'Subscription payment failed',
        body: 'Update your payment method to keep course access.',
        data: {
          courseId: localSubscription.accessPlan.courseId,
          accessPlanId: localSubscription.accessPlanId,
          subscriptionId: localSubscription.id,
        },
      },
    });
  }
}
