import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CreatorPayoutStatus,
  CreatorTransactionStatus,
  PaymentStatus,
  Prisma,
  RefundStatus,
} from '@smartklass/database';
import { PrismaService } from '../../common/database/prisma.service';
import { PaginatedResultDto } from '../../common/dto/pagination.dto';
import { AdminDashboardMetricsDto } from './dto/admin-risk.dto';
import { AdminListQueryDto } from './dto/admin-list.dto';

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private paginate<T>(
    page: number,
    limit: number,
    total: number,
    items: T[],
  ): PaginatedResultDto<T> {
    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  private dateRange(query: AdminListQueryDto) {
    return {
      ...(query.from ? { gte: new Date(query.from) } : {}),
      ...(query.to ? { lte: new Date(query.to) } : {}),
    };
  }

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

    const profileById = new Map(
      profiles.map((profile) => [profile.id, profile]),
    );

    return sorted.map((row) => ({
      creatorProfileId: row.creatorProfileId,
      displayName:
        profileById.get(row.creatorProfileId)?.displayName ?? 'Unknown',
      slug: profileById.get(row.creatorProfileId)?.slug ?? null,
      grossSalesCents: row._sum.grossAmountCents ?? 0,
      creatorNetCents: row._sum.creatorNetCents ?? 0,
      transactionCount: row._count,
      trustLevel:
        profileById.get(row.creatorProfileId)?.riskProfile?.trustLevel ?? 'NEW',
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

  async listRefunds(query: AdminListQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const range = this.dateRange(query);

    const where: Prisma.RefundWhereInput = {
      ...(query.status ? { status: query.status as RefundStatus } : {}),
      ...(Object.keys(range).length > 0 ? { createdAt: range } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.refund.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          creatorTransaction: {
            select: {
              id: true,
              creatorProfile: {
                select: { id: true, displayName: true, slug: true },
              },
              course: { select: { id: true, title: true } },
            },
          },
          payment: {
            select: { id: true, user: { select: { email: true } } },
          },
        },
      }),
      this.prisma.refund.count({ where }),
    ]);

    return this.paginate(page, limit, total, items);
  }

  async listDisputes(query: AdminListQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const range = this.dateRange(query);

    const where: Prisma.DisputeWhereInput = {
      ...(query.status ? { status: query.status as never } : {}),
      ...(Object.keys(range).length > 0 ? { createdAt: range } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.dispute.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          creatorTransaction: {
            select: {
              id: true,
              creatorProfile: {
                select: { id: true, displayName: true, slug: true },
              },
              course: { select: { id: true, title: true } },
            },
          },
        },
      }),
      this.prisma.dispute.count({ where }),
    ]);

    return this.paginate(page, limit, total, items);
  }

  async listPayouts(query: AdminListQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const range = this.dateRange(query);

    const where: Prisma.CreatorPayoutWhereInput = {
      ...(query.status ? { status: query.status as CreatorPayoutStatus } : {}),
      ...(query.creatorProfileId
        ? { creatorProfileId: query.creatorProfileId }
        : {}),
      ...(Object.keys(range).length > 0 ? { createdAt: range } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.creatorPayout.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          creatorProfile: {
            select: { id: true, displayName: true, slug: true },
          },
        },
      }),
      this.prisma.creatorPayout.count({ where }),
    ]);

    return this.paginate(page, limit, total, items);
  }

  async listCreatorTransactions(query: AdminListQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const range = this.dateRange(query);

    const where: Prisma.CreatorTransactionWhereInput = {
      ...(query.status
        ? { status: query.status as CreatorTransactionStatus }
        : {}),
      ...(query.creatorProfileId
        ? { creatorProfileId: query.creatorProfileId }
        : {}),
      ...(Object.keys(range).length > 0 ? { createdAt: range } : {}),
      ...(query.search
        ? {
            OR: [
              { id: { contains: query.search } },
              { stripeChargeId: { contains: query.search } },
              { stripePaymentIntentId: { contains: query.search } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.creatorTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          creatorProfile: {
            select: { id: true, displayName: true, slug: true },
          },
          course: { select: { id: true, title: true } },
          payment: {
            select: {
              id: true,
              status: true,
              user: { select: { email: true } },
            },
          },
        },
      }),
      this.prisma.creatorTransaction.count({ where }),
    ]);

    return this.paginate(page, limit, total, items);
  }

  async getCreatorTransactionById(id: string) {
    const transaction = await this.prisma.creatorTransaction.findUnique({
      where: { id },
      include: {
        creatorProfile: true,
        course: true,
        payment: {
          include: {
            user: { select: { id: true, email: true, profile: true } },
          },
        },
        refunds: true,
        disputes: true,
      },
    });
    if (!transaction) {
      throw new NotFoundException('Transaction not found.');
    }
    return transaction;
  }

  async listCreators(query: AdminListQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.CreatorProfileWhereInput = {
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { displayName: { contains: query.search } },
              { slug: { contains: query.search } },
            ],
          }
        : {}),
      ...(query.status
        ? { riskProfile: { trustLevel: query.status as never } }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.creatorProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { riskProfile: true },
      }),
      this.prisma.creatorProfile.count({ where }),
    ]);

    return this.paginate(page, limit, total, items);
  }
}
