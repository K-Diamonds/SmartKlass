import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  AccessPlanType,
  PaymentStatus,
  PurchaseStatus,
  SubscriptionStatus,
} from '@smartklass/database';
import { PrismaService } from '../../common/database/prisma.service';
import { OutboxService } from '../../common/outbox/outbox.service';
import { BillingFulfillmentService } from './billing-fulfillment.service';
import { CreatorBillingService } from './creator-billing.service';
import { MarketplaceAccountingService } from './marketplace-accounting.service';
import { StripeWebhookService } from './stripe-webhook.service';
import { MetricsService } from '../../common/observability/metrics.service';
import { TracingService } from '../../common/observability/tracing.service';
import { StripeClientService } from './stripe-client.service';

describe('StripeWebhookService', () => {
  let service: StripeWebhookService;

  const prismaMock = {
    processedStripeEvent: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    accessPlan: {
      findFirst: jest.fn(),
    },
    userSubscription: {
      findFirst: jest.fn(),
    },
    notification: {
      create: jest.fn(),
    },
  };

  const fulfillmentMock = {
    fulfillLifetimePurchase: jest.fn(),
    fulfillSubscription: jest.fn(),
    revokeSubscriptionAccess: jest.fn(),
    markSubscriptionPastDue: jest.fn(),
    mapStripeSubscriptionStatus: jest.fn(() => SubscriptionStatus.ACTIVE),
  };

  const creatorBillingMock = {
    fulfillCertificateStripePayment: jest.fn(),
    creditEarnings: jest.fn(),
  };

  const marketplaceAccountingMock = {
    syncRefundFromStripe: jest.fn(),
    syncDisputeFromStripe: jest.fn(),
    closeDisputeFromStripe: jest.fn(),
    syncPayoutFromStripe: jest.fn(),
    syncPayoutFailedFromStripe: jest.fn(),
  };

  const stripeMock = {
    webhooks: {
      constructEvent: jest.fn(),
    },
    subscriptions: {
      retrieve: jest.fn(),
    },
    paymentIntents: {
      retrieve: jest.fn(),
    },
  };

  const stripeClientMock = {
    getClient: jest.fn(() => stripeMock),
    getWebhookSecret: jest.fn(() => 'whsec_test'),
  };

  const tracingMock = {
    withSpan: jest.fn((_name: string, fn: () => Promise<unknown>) => fn()),
    startSpan: jest.fn(() => ({ end: jest.fn() })),
  };

  const metricsMock = {
    increment: jest.fn(),
    observe: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeWebhookService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: StripeClientService, useValue: stripeClientMock },
        { provide: BillingFulfillmentService, useValue: fulfillmentMock },
        { provide: CreatorBillingService, useValue: creatorBillingMock },
        { provide: MarketplaceAccountingService, useValue: marketplaceAccountingMock },
        { provide: MetricsService, useValue: metricsMock },
        { provide: TracingService, useValue: tracingMock },
      ],
    }).compile();

    service = module.get(StripeWebhookService);
  });

  it('rejects webhooks without a signature', async () => {
    await expect(
      service.handleWebhook(Buffer.from('{}'), undefined),
    ).rejects.toThrow(BadRequestException);
  });

  it('skips already processed events for idempotency', async () => {
    stripeMock.webhooks.constructEvent.mockReturnValue({
      id: 'evt_processed',
      type: 'checkout.session.completed',
      data: { object: {} },
    });
    prismaMock.processedStripeEvent.findUnique.mockResolvedValue({
      id: 'evt_processed',
      type: 'checkout.session.completed',
    });

    const result = await service.handleWebhook(Buffer.from('{}'), 'sig_test');

    expect(result.message).toContain('already processed');
    expect(fulfillmentMock.fulfillLifetimePurchase).not.toHaveBeenCalled();
    expect(prismaMock.processedStripeEvent.create).not.toHaveBeenCalled();
  });

  it('fulfills lifetime purchases on checkout.session.completed', async () => {
    stripeMock.webhooks.constructEvent.mockReturnValue({
      id: 'evt_checkout',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test',
          payment_intent: 'pi_test',
          metadata: {
            userId: 'user_1',
            accessPlanId: 'plan_lifetime',
            courseId: 'course_1',
            planType: AccessPlanType.ONE_TIME,
            paymentId: 'payment_1',
            purchaseId: 'purchase_1',
          },
        },
      },
    });
    prismaMock.processedStripeEvent.findUnique.mockResolvedValue(null);
    prismaMock.accessPlan.findFirst.mockResolvedValue({
      id: 'plan_lifetime',
      priceCents: 7900,
      currency: 'USD',
      accessDurationDays: null,
    });
    stripeMock.paymentIntents.retrieve.mockResolvedValue({
      latest_charge: 'ch_test',
    });

    const result = await service.handleWebhook(Buffer.from('{}'), 'sig_test');

    expect(result.received).toBe(true);
    expect(fulfillmentMock.fulfillLifetimePurchase).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_1',
        paymentId: 'payment_1',
        purchaseId: 'purchase_1',
        stripePaymentIntentId: 'pi_test',
        stripeChargeId: 'ch_test',
      }),
    );
    expect(prismaMock.processedStripeEvent.create).toHaveBeenCalledWith({
      data: {
        id: 'evt_checkout',
        type: 'checkout.session.completed',
      },
    });
  });

  it('syncs subscriptions on customer.subscription.updated', async () => {
    stripeMock.webhooks.constructEvent.mockReturnValue({
      id: 'evt_sub_updated',
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_test',
          status: 'active',
          canceled_at: null,
          metadata: {
            userId: 'user_1',
            accessPlanId: 'plan_monthly',
            courseId: 'course_1',
          },
          items: {
            data: [
              {
                current_period_start: 1_700_000_000,
                current_period_end: 1_702_592_000,
              },
            ],
          },
        },
      },
    });
    prismaMock.processedStripeEvent.findUnique.mockResolvedValue(null);

    await service.handleWebhook(Buffer.from('{}'), 'sig_test');

    expect(fulfillmentMock.fulfillSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        stripeSubscriptionId: 'sub_test',
        userId: 'user_1',
        accessPlanId: 'plan_monthly',
      }),
    );
  });

  it('revokes access on customer.subscription.deleted', async () => {
    stripeMock.webhooks.constructEvent.mockReturnValue({
      id: 'evt_sub_deleted',
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: 'sub_test',
        },
      },
    });
    prismaMock.processedStripeEvent.findUnique.mockResolvedValue(null);

    await service.handleWebhook(Buffer.from('{}'), 'sig_test');

    expect(fulfillmentMock.revokeSubscriptionAccess).toHaveBeenCalledWith(
      'sub_test',
    );
  });

  it('marks subscriptions past due on invoice.payment_failed', async () => {
    stripeMock.webhooks.constructEvent.mockReturnValue({
      id: 'evt_invoice_failed',
      type: 'invoice.payment_failed',
      data: {
        object: {
          id: 'in_test',
          parent: {
            type: 'subscription_details',
            subscription_details: {
              subscription: 'sub_test',
            },
          },
        },
      },
    });
    prismaMock.processedStripeEvent.findUnique.mockResolvedValue(null);
    prismaMock.userSubscription.findFirst.mockResolvedValue({
      id: 'local_sub',
      userId: 'user_1',
      accessPlanId: 'plan_monthly',
      accessPlan: { courseId: 'course_1' },
    });

    await service.handleWebhook(Buffer.from('{}'), 'sig_test');

    expect(fulfillmentMock.markSubscriptionPastDue).toHaveBeenCalledWith(
      'sub_test',
    );
    expect(prismaMock.notification.create).toHaveBeenCalled();
  });
});

describe('BillingFulfillmentService', () => {
  let fulfillment: BillingFulfillmentService;

  const txMock = {
    userPurchase: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    payment: {
      update: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    courseAccess: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    notification: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    course: {
      findUnique: jest.fn(),
    },
    userSubscription: {
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    accessPlan: {
      findUnique: jest.fn(),
    },
  };

  const prismaMock = {
    $transaction: jest.fn(),
    course: {
      findFirst: jest.fn(),
    },
    payment: {
      findUnique: jest.fn(),
    },
    userSubscription: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  const creatorBillingMock = {
    creditEarnings: jest.fn(),
  };

  const marketplaceAccountingMock = {
    recordSaleFromPaymentMetadata: jest.fn(),
  };

  const outboxMock = {
    append: jest.fn(),
    appendMany: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation(
      async (callback: (tx: typeof txMock) => Promise<unknown>) =>
        callback(txMock),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingFulfillmentService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: MarketplaceAccountingService, useValue: marketplaceAccountingMock },
        { provide: OutboxService, useValue: outboxMock },
      ],
    }).compile();

    fulfillment = module.get(BillingFulfillmentService);
  });

  it('completes pending lifetime purchases and grants course access', async () => {
    txMock.userPurchase.findUnique.mockResolvedValue({
      id: 'purchase_1',
      status: PurchaseStatus.PENDING,
      courseAccess: null,
    });
    txMock.payment.update.mockResolvedValue({ id: 'payment_1' });
    txMock.payment.findUnique.mockResolvedValue({
      metadata: {
        platformFeeCents: 1580,
        creatorEarningsCents: 6320,
      },
    });
    txMock.userPurchase.update.mockResolvedValue({
      id: 'purchase_1',
      status: PurchaseStatus.COMPLETED,
    });
    txMock.courseAccess.findFirst.mockResolvedValue(null);
    txMock.courseAccess.create.mockResolvedValue({ id: 'access_1' });
    txMock.course.findUnique
      .mockResolvedValueOnce({ title: 'Pasta Basics' })
      .mockResolvedValueOnce({ creatorProfileId: 'creator_1' });
    txMock.notification.findFirst.mockResolvedValue(null);

    await fulfillment.fulfillLifetimePurchase({
      userId: 'user_1',
      courseId: 'course_1',
      accessPlanId: 'plan_lifetime',
      paymentId: 'payment_1',
      purchaseId: 'purchase_1',
      stripePaymentIntentId: 'pi_test',
      amountCents: 7900,
      currency: 'USD',
    });

    const [[updateArgs]] = txMock.payment.update.mock.calls as [
      [
        {
          where: { id: string };
          data: { status: PaymentStatus };
        },
      ],
    ];

    expect(updateArgs.where.id).toBe('payment_1');
    expect(updateArgs.data.status).toBe(PaymentStatus.SUCCEEDED);
    expect(txMock.courseAccess.create).toHaveBeenCalled();
  });

  it('maps Stripe subscription statuses', () => {
    expect(fulfillment.mapStripeSubscriptionStatus('active')).toBe(
      SubscriptionStatus.ACTIVE,
    );
    expect(fulfillment.mapStripeSubscriptionStatus('past_due')).toBe(
      SubscriptionStatus.PAST_DUE,
    );
  });
});
