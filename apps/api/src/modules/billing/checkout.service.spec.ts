import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  AccessPlanType,
  BillingInterval,
  CourseStatus,
} from '@smartklass/database';
import { PrismaService } from '../../common/database/prisma.service';
import { CheckoutService } from './checkout.service';
import { BillingFulfillmentService } from './billing-fulfillment.service';
import { CreatorBillingService } from './creator-billing.service';
import { StripeClientService } from './stripe-client.service';

describe('CheckoutService', () => {
  let service: CheckoutService;

  const stripeMock = {
    checkout: {
      sessions: {
        create: jest.fn(),
      },
    },
    products: {
      create: jest.fn(),
    },
    prices: {
      create: jest.fn(),
    },
  };

  const prismaMock = {
    accessPlan: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    userPurchase: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const fulfillmentMock = {
    fulfillOwnerSelfSubscribe: jest.fn(),
  };

  const creatorBillingMock = {
    getConnectDestinationForCourse: jest
      .fn()
      .mockResolvedValue('acct_creator_1'),
  };

  const stripeClientMock = {
    getClient: jest.fn(() => stripeMock),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    prismaMock.$transaction.mockImplementation(
      async (callback: (tx: typeof prismaMock) => Promise<unknown>) =>
        callback(prismaMock),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckoutService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: StripeClientService, useValue: stripeClientMock },
        { provide: BillingFulfillmentService, useValue: fulfillmentMock },
        { provide: CreatorBillingService, useValue: creatorBillingMock },
      ],
    }).compile();

    service = module.get(CheckoutService);
  });

  it('rejects checkout for free plans', async () => {
    prismaMock.accessPlan.findFirst.mockResolvedValue({
      id: 'plan_free',
      planType: AccessPlanType.FREE,
      priceCents: 0,
      course: { deletedAt: null, status: CourseStatus.PUBLISHED },
    });

    await expect(
      service.createCoursePlanCheckout('user_1', {
        accessPlanId: 'plan_free',
        successUrl: 'http://localhost:3000/success',
        cancelUrl: 'http://localhost:3000/cancel',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('creates a lifetime checkout session with a 20% platform fee', async () => {
    prismaMock.accessPlan.findFirst.mockResolvedValue({
      id: 'plan_lifetime',
      courseId: 'course_1',
      name: 'Lifetime Access',
      planType: AccessPlanType.ONE_TIME,
      priceCents: 7900,
      currency: 'USD',
      billingInterval: null,
      stripePriceId: 'price_lifetime',
      course: {
        id: 'course_1',
        title: 'Pasta Basics',
        deletedAt: null,
        status: CourseStatus.PUBLISHED,
        creatorProfileId: 'creator_profile_1',
      },
    });
    prismaMock.payment.create.mockResolvedValue({ id: 'payment_1' });
    prismaMock.userPurchase.create.mockResolvedValue({ id: 'purchase_1' });
    prismaMock.payment.findUnique.mockResolvedValue({
      metadata: {
        platformFeeCents: 1580,
        creatorEarningsCents: 6320,
      },
    });
    stripeMock.checkout.sessions.create.mockResolvedValue({
      id: 'cs_test_123',
      url: 'https://checkout.stripe.com/c/pay/cs_test_123',
    });

    const result = await service.createCoursePlanCheckout('user_1', {
      accessPlanId: 'plan_lifetime',
      successUrl: 'http://localhost:3000/success',
      cancelUrl: 'http://localhost:3000/cancel',
    });

    expect(result.checkoutUrl).toContain('checkout.stripe.com');
    expect(result.planType).toBe(AccessPlanType.ONE_TIME);
    const [[sessionArgs]] = stripeMock.checkout.sessions.create.mock.calls as [
      [
        {
          mode: string;
          metadata: Record<string, string>;
          payment_intent_data: {
            application_fee_amount: number;
            transfer_data: { destination: string };
          };
        },
      ],
    ];

    expect(sessionArgs.mode).toBe('payment');
    expect(sessionArgs.metadata.userId).toBe('user_1');
    expect(sessionArgs.metadata.paymentId).toBe('payment_1');
    expect(sessionArgs.metadata.purchaseId).toBe('purchase_1');
    expect(sessionArgs.payment_intent_data.application_fee_amount).toBe(1580);
    expect(result.platformFeeCents).toBe(1580);
    expect(result.creatorEarningsCents).toBe(6320);
    expect(sessionArgs.payment_intent_data.transfer_data.destination).toBe(
      'acct_creator_1',
    );
  });

  it('creates a subscription checkout session with application_fee_percent', async () => {
    prismaMock.accessPlan.findFirst.mockResolvedValue({
      id: 'plan_monthly',
      courseId: 'course_1',
      name: 'Monthly Access',
      planType: AccessPlanType.SUBSCRIPTION,
      priceCents: 1499,
      currency: 'USD',
      billingInterval: BillingInterval.MONTHLY,
      stripePriceId: 'price_monthly',
      course: {
        id: 'course_1',
        title: 'Pasta Basics',
        deletedAt: null,
        status: CourseStatus.PUBLISHED,
        creatorProfileId: 'creator_profile_1',
      },
    });
    stripeMock.checkout.sessions.create.mockResolvedValue({
      id: 'cs_test_sub',
      url: 'https://checkout.stripe.com/c/pay/cs_test_sub',
    });

    const result = await service.createCoursePlanCheckout('user_1', {
      accessPlanId: 'plan_monthly',
      successUrl: 'http://localhost:3000/success',
      cancelUrl: 'http://localhost:3000/cancel',
    });

    expect(result.billingInterval).toBe(BillingInterval.MONTHLY);
    expect(stripeMock.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'subscription',
        subscription_data: expect.objectContaining({
          transfer_data: { destination: 'acct_creator_1' },
          application_fee_percent: expect.any(Number),
        }),
      }),
    );
    const [[sessionArgs]] = stripeMock.checkout.sessions.create.mock.calls as [
      [
        {
          subscription_data: {
            application_fee_percent: number;
          };
        },
      ],
    ];
    expect(sessionArgs.subscription_data.application_fee_percent).toBeCloseTo(
      33.36,
      1,
    );
    expect(prismaMock.payment.create).not.toHaveBeenCalled();
  });

  it('rejects checkout when creator Stripe Connect is not completed', async () => {
    creatorBillingMock.getConnectDestinationForCourse.mockRejectedValue(
      new BadRequestException(
        'This course is not available for purchase until the creator connects Stripe for payouts.',
      ),
    );
    prismaMock.accessPlan.findFirst.mockResolvedValue({
      id: 'plan_lifetime',
      courseId: 'course_1',
      name: 'Lifetime Access',
      planType: AccessPlanType.ONE_TIME,
      priceCents: 7900,
      currency: 'USD',
      billingInterval: null,
      stripePriceId: 'price_lifetime',
      course: {
        id: 'course_1',
        title: 'Pasta Basics',
        deletedAt: null,
        status: CourseStatus.PUBLISHED,
        creatorProfileId: 'creator_profile_1',
      },
    });

    await expect(
      service.createCoursePlanCheckout('user_1', {
        accessPlanId: 'plan_lifetime',
        successUrl: 'http://localhost:3000/success',
        cancelUrl: 'http://localhost:3000/cancel',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws when the access plan does not exist', async () => {
    prismaMock.accessPlan.findFirst.mockResolvedValue(null);

    await expect(
      service.createCoursePlanCheckout('user_1', {
        accessPlanId: 'missing',
        successUrl: 'http://localhost:3000/success',
        cancelUrl: 'http://localhost:3000/cancel',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('surfaces Stripe configuration errors from the client service', async () => {
    stripeClientMock.getClient.mockImplementation(() => {
      throw new ServiceUnavailableException(
        'Stripe is not configured. Set STRIPE_SECRET_KEY in your environment.',
      );
    });

    prismaMock.accessPlan.findFirst.mockResolvedValue({
      id: 'plan_lifetime',
      courseId: 'course_1',
      name: 'Lifetime Access',
      planType: AccessPlanType.ONE_TIME,
      priceCents: 7900,
      currency: 'USD',
      billingInterval: null,
      stripePriceId: 'price_lifetime',
      course: {
        id: 'course_1',
        title: 'Pasta Basics',
        deletedAt: null,
        status: CourseStatus.PUBLISHED,
        creatorProfileId: 'creator_profile_1',
      },
    });

    await expect(
      service.createCoursePlanCheckout('user_1', {
        accessPlanId: 'plan_lifetime',
        successUrl: 'http://localhost:3000/success',
        cancelUrl: 'http://localhost:3000/cancel',
      }),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('grants owner self-subscribe access without Stripe', async () => {
    prismaMock.accessPlan.findFirst.mockResolvedValue({
      id: 'plan_monthly',
      courseId: 'course_1',
      planType: AccessPlanType.SUBSCRIPTION,
      billingInterval: BillingInterval.MONTHLY,
      accessDurationDays: null,
      currency: 'USD',
      course: {
        id: 'course_1',
        deletedAt: null,
        status: CourseStatus.DRAFT,
        creatorProfile: {
          userId: 'owner_user',
          deletedAt: null,
        },
      },
    });
    fulfillmentMock.fulfillOwnerSelfSubscribe.mockResolvedValue({
      alreadySubscribed: false,
    });

    const result = await service.ownerSelfSubscribe(
      'owner_user',
      'plan_monthly',
    );

    expect(result).toEqual({
      courseId: 'course_1',
      accessPlanId: 'plan_monthly',
      alreadySubscribed: false,
    });
    expect(fulfillmentMock.fulfillOwnerSelfSubscribe).toHaveBeenCalledWith({
      userId: 'owner_user',
      courseId: 'course_1',
      accessPlanId: 'plan_monthly',
      planType: AccessPlanType.SUBSCRIPTION,
      accessDurationDays: null,
      currency: 'USD',
    });
    expect(stripeMock.checkout.sessions.create).not.toHaveBeenCalled();
  });
});
