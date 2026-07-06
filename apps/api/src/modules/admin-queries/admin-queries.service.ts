import { Injectable } from '@nestjs/common';
import {
  CreatorPayoutStatus,
  CreatorTransactionStatus,
  PaymentStatus,
  Prisma,
  RefundStatus,
} from '@smartklass/database';
import { PrismaService } from '../../common/database/prisma.service';

@Injectable()
export class PlatformRevenueQuery {
  constructor(private readonly prisma: PrismaService) {}

  async execute(currency = 'USD') {
    const [
      payments,
      platformFees,
      refunds,
      pendingPayouts,
      availablePayouts,
      openDisputes,
      failedPayouts,
    ] = await Promise.all([
      this.prisma.payment.aggregate({
        where: { status: PaymentStatus.SUCCEEDED, currency },
        _sum: { amountCents: true },
      }),
      this.prisma.creatorTransaction.aggregate({
        where: { currency },
        _sum: { platformFeeCents: true, creatorNetCents: true },
      }),
      this.prisma.refund.aggregate({
        where: { status: RefundStatus.SUCCEEDED, currency },
        _sum: { amountCents: true },
      }),
      this.prisma.creatorTransaction.aggregate({
        where: { currency, status: CreatorTransactionStatus.PENDING },
        _sum: { creatorNetCents: true },
      }),
      this.prisma.creatorTransaction.aggregate({
        where: { currency, status: CreatorTransactionStatus.AVAILABLE },
        _sum: { creatorNetCents: true },
      }),
      this.prisma.dispute.count({ where: { closedAt: null } }),
      this.prisma.creatorPayout.count({
        where: { status: CreatorPayoutStatus.FAILED },
      }),
    ]);

    return {
      platformRevenueCents: platformFees._sum.platformFeeCents ?? 0,
      grossMerchandiseVolumeCents: payments._sum.amountCents ?? 0,
      creatorEarningsCents: platformFees._sum.creatorNetCents ?? 0,
      pendingPayoutsCents: pendingPayouts._sum.creatorNetCents ?? 0,
      availablePayoutsCents: availablePayouts._sum.creatorNetCents ?? 0,
      refundsCents: refunds._sum.amountCents ?? 0,
      openDisputes,
      failedPayouts,
      currency,
    };
  }
}

@Injectable()
export class CreatorRevenueQuery {
  constructor(private readonly prisma: PrismaService) {}

  async execute(creatorProfileId: string, from?: Date, to?: Date) {
    const range: Prisma.CreatorTransactionWhereInput = {
      creatorProfileId,
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    };

    const [totals, byCourse] = await Promise.all([
      this.prisma.creatorTransaction.aggregate({
        where: range,
        _sum: {
          grossAmountCents: true,
          platformFeeCents: true,
          creatorNetCents: true,
        },
        _count: true,
      }),
      this.prisma.creatorTransaction.groupBy({
        by: ['courseId'],
        where: range,
        _sum: { creatorNetCents: true, grossAmountCents: true },
        _count: true,
      }),
    ]);

    const courses = await this.prisma.course.findMany({
      where: { id: { in: byCourse.map((r) => r.courseId) } },
      select: { id: true, title: true },
    });
    const courseById = new Map(courses.map((c) => [c.id, c.title]));

    return {
      creatorProfileId,
      transactionCount: totals._count,
      grossSalesCents: totals._sum.grossAmountCents ?? 0,
      platformFeeCents: totals._sum.platformFeeCents ?? 0,
      creatorNetCents: totals._sum.creatorNetCents ?? 0,
      byCourse: byCourse.map((row) => ({
        courseId: row.courseId,
        courseTitle: courseById.get(row.courseId) ?? 'Unknown',
        grossSalesCents: row._sum.grossAmountCents ?? 0,
        creatorNetCents: row._sum.creatorNetCents ?? 0,
        transactionCount: row._count,
      })),
    };
  }
}

@Injectable()
export class RiskDashboardQuery {
  constructor(private readonly prisma: PrismaService) {}

  async execute(limit = 20) {
    const [profiles, recentEvents, flaggedTransactions] = await Promise.all([
      this.prisma.creatorRiskProfile.findMany({
        where: {
          OR: [
            { trustLevel: 'HIGH_RISK' },
            { trustLevel: 'SUSPENDED' },
            { manualReviewRequired: true },
          ],
        },
        orderBy: [{ disputeRate: 'desc' }, { refundRate: 'desc' }],
        take: limit,
        include: {
          creatorProfile: {
            select: { id: true, displayName: true, slug: true, isActive: true },
          },
        },
      }),
      this.prisma.creatorRiskEvent.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          creatorProfile: { select: { displayName: true, slug: true } },
        },
      }),
      this.prisma.creatorTransaction.count({
        where: { adminFlaggedAt: { not: null } },
      }),
    ]);

    return {
      flaggedTransactionCount: flaggedTransactions,
      highRiskCreators: profiles.map((p) => ({
        creatorProfileId: p.creatorProfileId,
        displayName: p.creatorProfile.displayName,
        slug: p.creatorProfile.slug,
        trustLevel: p.trustLevel,
        disputeRate: p.disputeRate,
        refundRate: p.refundRate,
        manualReviewRequired: p.manualReviewRequired,
      })),
      recentRiskEvents: recentEvents,
    };
  }
}

@Injectable()
export class TransactionTimelineQuery {
  constructor(private readonly prisma: PrismaService) {}

  async execute(params: {
    creatorProfileId?: string;
    courseId?: string;
    from?: Date;
    to?: Date;
    limit?: number;
  }) {
    const limit = Math.min(params.limit ?? 50, 200);
    const where: Prisma.CreatorTransactionWhereInput = {
      ...(params.creatorProfileId
        ? { creatorProfileId: params.creatorProfileId }
        : {}),
      ...(params.courseId ? { courseId: params.courseId } : {}),
      ...(params.from || params.to
        ? {
            createdAt: {
              ...(params.from ? { gte: params.from } : {}),
              ...(params.to ? { lte: params.to } : {}),
            },
          }
        : {}),
    };

    const transactions = await this.prisma.creatorTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        creatorProfile: { select: { displayName: true, slug: true } },
        course: { select: { title: true } },
        payment: { select: { status: true, user: { select: { email: true } } } },
        refunds: { select: { id: true, amountCents: true, status: true, createdAt: true } },
        disputes: { select: { id: true, status: true, createdAt: true } },
      },
    });

    return transactions.map((tx) => ({
      id: tx.id,
      createdAt: tx.createdAt,
      status: tx.status,
      type: tx.type,
      grossAmountCents: tx.grossAmountCents,
      creatorNetCents: tx.creatorNetCents,
      currency: tx.currency,
      creator: tx.creatorProfile,
      course: tx.course,
      payment: tx.payment,
      refunds: tx.refunds,
      disputes: tx.disputes,
      adminFlaggedAt: tx.adminFlaggedAt,
    }));
  }
}
