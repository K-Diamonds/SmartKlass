import { Test, TestingModule } from '@nestjs/testing';
import {
  CreatorPayoutStatus,
  CreatorTransactionStatus,
  CreatorTransactionType,
  PaymentStatus,
  RefundStatus,
} from '@smartklass/database';
import { CREATOR_PAYOUT_DELAY_DAYS } from '@smartklass/shared';
import { PrismaService } from '../../common/database/prisma.service';
import { MarketplaceAccountingService } from './marketplace-accounting.service';

describe('MarketplaceAccountingService', () => {
  let service: MarketplaceAccountingService;

  const txMock = {
    creatorTransaction: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
    },
    refund: {
      upsert: jest.fn(),
    },
    payment: {
      update: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    dispute: {
      upsert: jest.fn(),
      update: jest.fn(),
    },
    creatorPayout: {
      upsert: jest.fn(),
    },
  };

  const prismaMock = {
    $transaction: jest.fn(),
    creatorTransaction: {
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
    },
    creatorProfile: {
      findFirst: jest.fn(),
    },
    payment: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    dispute: {
      upsert: jest.fn(),
      update: jest.fn(),
    },
    creatorPayout: {
      upsert: jest.fn(),
    },
    refund: {
      upsert: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation(
      async (callback: (tx: typeof txMock) => Promise<unknown>) =>
        callback(txMock),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketplaceAccountingService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get(MarketplaceAccountingService);
  });

  it('creates a pending creator transaction with a 30-day availableAt', async () => {
    const paidAt = new Date('2026-07-05T12:00:00.000Z');
    txMock.creatorTransaction.findFirst.mockResolvedValue(null);
    txMock.creatorTransaction.create.mockResolvedValue({
      id: 'ctx_1',
      status: CreatorTransactionStatus.PENDING,
    });

    await service.recordSale(txMock as never, {
      paymentId: 'payment_1',
      creatorProfileId: 'creator_1',
      courseId: 'course_1',
      accessPlanId: 'plan_1',
      userId: 'user_1',
      type: CreatorTransactionType.ONE_TIME_PURCHASE,
      grossAmountCents: 7900,
      platformFeeCents: 1580,
      creatorNetCents: 6320,
      currency: 'USD',
      paidAt,
    });

    const [[createArgs]] = txMock.creatorTransaction.create.mock.calls as [
      [
        {
          data: {
            status: CreatorTransactionStatus;
            platformFeeCents: number;
            creatorNetCents: number;
            availableAt: Date;
          };
        },
      ],
    ];

    expect(createArgs.data.status).toBe(CreatorTransactionStatus.PENDING);
    expect(createArgs.data.platformFeeCents).toBe(1580);
    expect(createArgs.data.creatorNetCents).toBe(6320);

    const expectedAvailable = new Date(paidAt);
    expectedAvailable.setDate(
      expectedAvailable.getDate() + CREATOR_PAYOUT_DELAY_DAYS,
    );
    expect(createArgs.data.availableAt.toISOString()).toBe(
      expectedAvailable.toISOString(),
    );
  });

  it('derives ledger balances from creator transactions', async () => {
    prismaMock.creatorTransaction.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.creatorTransaction.findMany.mockResolvedValue([
      { status: CreatorTransactionStatus.PENDING, creatorNetCents: 1000 },
      { status: CreatorTransactionStatus.AVAILABLE, creatorNetCents: 2500 },
      { status: CreatorTransactionStatus.PAID_OUT, creatorNetCents: 5000 },
      { status: CreatorTransactionStatus.REFUNDED, creatorNetCents: 300 },
    ]);

    const balances = await service.getLedgerBalances('creator_1');

    expect(balances.pendingCents).toBe(1000);
    expect(balances.availableCents).toBe(2500);
    expect(balances.paidOutCents).toBe(5000);
    expect(balances.refundedCents).toBe(300);
  });

  it('is idempotent when recording the same payment twice', async () => {
    txMock.creatorTransaction.findFirst.mockResolvedValue({
      id: 'ctx_existing',
    });

    const result = await service.recordSale(txMock as never, {
      paymentId: 'payment_1',
      creatorProfileId: 'creator_1',
      courseId: 'course_1',
      accessPlanId: 'plan_1',
      userId: 'user_1',
      type: CreatorTransactionType.ONE_TIME_PURCHASE,
      grossAmountCents: 7900,
      platformFeeCents: 1580,
      creatorNetCents: 6320,
      currency: 'USD',
    });

    expect(result.id).toBe('ctx_existing');
    expect(txMock.creatorTransaction.create).not.toHaveBeenCalled();
  });

  it('reverses creator transaction on successful refund', async () => {
    prismaMock.creatorTransaction.findFirst.mockResolvedValue({
      id: 'ctx_1',
      paymentId: 'payment_1',
    });
    prismaMock.payment.findFirst.mockResolvedValue({ id: 'payment_1' });
    txMock.refund.upsert.mockResolvedValue({ id: 'refund_1' });

    await service.syncRefundFromStripe({
      id: 're_1',
      object: 'refund',
      amount: 7900,
      charge: 'ch_1',
      currency: 'usd',
      status: 'succeeded',
      reason: 'requested_by_customer',
    } as never);

    expect(txMock.creatorTransaction.update).toHaveBeenCalledWith({
      where: { id: 'ctx_1' },
      data: { status: CreatorTransactionStatus.REFUNDED },
    });
    expect(txMock.payment.update).toHaveBeenCalledWith({
      where: { id: 'payment_1' },
      data: { status: PaymentStatus.REFUNDED },
    });
    expect(txMock.refund.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { stripeRefundId: 're_1' },
        create: expect.objectContaining({
          status: RefundStatus.SUCCEEDED,
        }),
      }),
    );
  });

  it('freezes creator transaction when a dispute is opened', async () => {
    prismaMock.creatorTransaction.findFirst.mockResolvedValue({
      id: 'ctx_1',
      paymentId: 'payment_1',
    });
    prismaMock.payment.findUnique.mockResolvedValue({ id: 'payment_1' });

    await service.syncDisputeFromStripe({
      id: 'dp_1',
      object: 'dispute',
      amount: 7900,
      charge: 'ch_1',
      currency: 'usd',
      status: 'needs_response',
      reason: 'fraudulent',
    } as never);

    expect(prismaMock.creatorTransaction.update).toHaveBeenCalledWith({
      where: { id: 'ctx_1' },
      data: { status: CreatorTransactionStatus.DISPUTED },
    });
    expect(prismaMock.dispute.upsert).toHaveBeenCalled();
  });

  it('promotes matured pending transactions to available', async () => {
    prismaMock.creatorTransaction.updateMany.mockResolvedValue({ count: 3 });

    const count = await service.promoteMaturedTransactions('creator_1');

    expect(count).toBe(3);
    expect(prismaMock.creatorTransaction.updateMany).toHaveBeenCalledWith({
      where: {
        status: CreatorTransactionStatus.PENDING,
        availableAt: { lte: expect.any(Date) },
        creatorProfileId: 'creator_1',
      },
      data: { status: CreatorTransactionStatus.AVAILABLE },
    });
  });

  it('records paid payouts and marks available transactions paid out', async () => {
    prismaMock.creatorProfile.findFirst.mockResolvedValue({ id: 'creator_1' });
    prismaMock.creatorPayout.upsert.mockResolvedValue({ id: 'payout_1' });
    prismaMock.creatorTransaction.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.creatorTransaction.findMany.mockResolvedValue([
      { id: 'ctx_1', creatorNetCents: 5000 },
    ]);

    await service.syncPayoutFromStripe(
      {
        id: 'po_1',
        object: 'payout',
        amount: 5000,
        currency: 'usd',
        status: 'paid',
        arrival_date: 1_752_000_000,
      } as never,
      'acct_creator_1',
    );

    expect(prismaMock.creatorPayout.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { stripePayoutId: 'po_1' },
        create: expect.objectContaining({
          status: CreatorPayoutStatus.PAID,
        }),
      }),
    );
    expect(prismaMock.creatorTransaction.update).toHaveBeenCalledWith({
      where: { id: 'ctx_1' },
      data: {
        status: CreatorTransactionStatus.PAID_OUT,
        paidOutAt: expect.any(Date),
      },
    });
  });
});
