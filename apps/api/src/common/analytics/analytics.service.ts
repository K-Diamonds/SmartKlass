import { Injectable } from '@nestjs/common';
import { PaymentStatus, Prisma } from '@smartklass/database';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async recordEvent(input: {
    creatorProfileId?: string;
    grossAmountCents?: number;
    currency?: string;
    transactionId?: string;
  }) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const [payments, transactions, grants, gmv, fees] = await Promise.all([
      this.prisma.payment.count({ where: { status: PaymentStatus.SUCCEEDED } }),
      this.prisma.creatorTransaction.count(),
      this.prisma.courseAccess.count({ where: { revokedAt: null } }),
      this.prisma.payment.aggregate({
        where: { status: PaymentStatus.SUCCEEDED },
        _sum: { amountCents: true },
      }),
      this.prisma.creatorTransaction.aggregate({
        _sum: { platformFeeCents: true },
      }),
    ]);

    await this.prisma.analyticsSnapshot.upsert({
      where: { snapshotDate: today },
      create: {
        snapshotDate: today,
        succeededPayments: payments,
        creatorTransactions: transactions,
        activeGrants: grants,
        grossMerchandiseCents: gmv._sum.amountCents ?? 0,
        platformRevenueCents: fees._sum.platformFeeCents ?? 0,
        metadata: input as Prisma.InputJsonValue,
      },
      update: {
        succeededPayments: payments,
        creatorTransactions: transactions,
        activeGrants: grants,
        grossMerchandiseCents: gmv._sum.amountCents ?? 0,
        platformRevenueCents: fees._sum.platformFeeCents ?? 0,
        metadata: input as Prisma.InputJsonValue,
      },
    });
  }
}
