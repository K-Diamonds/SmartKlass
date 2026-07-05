import { Injectable } from '@nestjs/common';
import {
  CreatorPayoutStatus,
  CreatorTransactionStatus,
  PaymentStatus,
  RefundStatus,
} from '@smartklass/database';
import { PrismaService } from '../../common/database/prisma.service';
import { AdminDashboardMetricsDto } from './dto/admin-risk.dto';

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getMetrics(currency = 'USD'): Promise<AdminDashboardMetricsDto> {
    const [
      payments,
      creatorEarnings,
      pendingPayouts,
      availablePayouts,
      refunds,
      openDisputes,
      failedPayouts,
    ] = await Promise.all([
      this.prisma.payment.aggregate({
        where: {
          status: PaymentStatus.SUCCEEDED,
          currency,
        },
        _sum: { amountCents: true },
      }),
      this.prisma.creatorTransaction.aggregate({
        where: { currency },
        _sum: { creatorNetCents: true },
      }),
      this.prisma.creatorTransaction.aggregate({
        where: {
          currency,
          status: CreatorTransactionStatus.PENDING,
        },
        _sum: { creatorNetCents: true },
      }),
      this.prisma.creatorTransaction.aggregate({
        where: {
          currency,
          status: CreatorTransactionStatus.AVAILABLE,
        },
        _sum: { creatorNetCents: true },
      }),
      this.prisma.refund.aggregate({
        where: {
          currency,
          status: RefundStatus.SUCCEEDED,
        },
        _sum: { amountCents: true },
      }),
      this.prisma.dispute.count({
        where: {
          closedAt: null,
        },
      }),
      this.prisma.creatorPayout.count({
        where: { status: CreatorPayoutStatus.FAILED },
      }),
    ]);

    const gmv = payments._sum.amountCents ?? 0;
    const platformRevenue = await this.prisma.creatorTransaction.aggregate({
      where: { currency },
      _sum: { platformFeeCents: true },
    });

    return {
      platformRevenueCents: platformRevenue._sum.platformFeeCents ?? 0,
      grossMerchandiseVolumeCents: gmv,
      creatorEarningsCents: creatorEarnings._sum.creatorNetCents ?? 0,
      pendingPayoutsCents: pendingPayouts._sum.creatorNetCents ?? 0,
      availablePayoutsCents: availablePayouts._sum.creatorNetCents ?? 0,
      refundsCents: refunds._sum.amountCents ?? 0,
      openDisputes,
      failedPayouts,
      currency,
    };
  }

  async getTopCreators(limit = 10) {
    const grouped = await this.prisma.creatorTransaction.groupBy({
      by: ['creatorProfileId'],
      _sum: { creatorNetCents: true, grossAmountCents: true },
      _count: true,
    });

    const sorted = grouped
      .sort(
        (a, b) =>
          (b._sum.grossAmountCents ?? 0) - (a._sum.grossAmountCents ?? 0),
      )
      .slice(0, limit);

    const profiles = await this.prisma.creatorProfile.findMany({
      where: { id: { in: sorted.map((row) => row.creatorProfileId) } },
      select: {
        id: true,
        displayName: true,
        slug: true,
        riskProfile: true,
      },
    });

    const profileById = new Map(profiles.map((profile) => [profile.id, profile]));

    return sorted.map((row) => ({
      creatorProfileId: row.creatorProfileId,
      displayName:
        profileById.get(row.creatorProfileId)?.displayName ?? 'Unknown',
      slug: profileById.get(row.creatorProfileId)?.slug ?? null,
      grossSalesCents: row._sum.grossAmountCents ?? 0,
      creatorNetCents: row._sum.creatorNetCents ?? 0,
      transactionCount: row._count,
      trustLevel: profileById.get(row.creatorProfileId)?.riskProfile?.trustLevel ?? 'NEW',
    }));
  }

  async getSuspiciousCreators(limit = 20) {
    const profiles = await this.prisma.creatorRiskProfile.findMany({
      where: {
        OR: [
          { trustLevel: 'HIGH_RISK' },
          { trustLevel: 'SUSPENDED' },
          { manualReviewRequired: true },
          { disputeRate: { gte: 0.02 } },
          { refundRate: { gte: 0.05 } },
        ],
      },
      orderBy: [{ disputeRate: 'desc' }, { refundRate: 'desc' }],
      take: limit,
      include: {
        creatorProfile: {
          select: {
            id: true,
            displayName: true,
            slug: true,
            isActive: true,
          },
        },
      },
    });

    return profiles.map((profile) => ({
      creatorProfileId: profile.creatorProfileId,
      displayName: profile.creatorProfile.displayName,
      slug: profile.creatorProfile.slug,
      isActive: profile.creatorProfile.isActive,
      trustLevel: profile.trustLevel,
      payoutDelayDays: profile.payoutDelayDays,
      disputeRate: profile.disputeRate,
      refundRate: profile.refundRate,
      manualReviewRequired: profile.manualReviewRequired,
      lifetimeSalesCents: profile.lifetimeSalesCents,
    }));
  }

  async getRecentPayments(limit = 50) {
    return this.prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        amountCents: true,
        currency: true,
        status: true,
        stripePaymentIntentId: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            email: true,
            profile: { select: { displayName: true } },
          },
        },
        creatorTransaction: {
          select: {
            course: {
              select: {
                id: true,
                title: true,
                creatorProfile: {
                  select: { id: true, displayName: true, slug: true },
                },
              },
            },
          },
        },
      },
    });
  }
}
