import { Injectable } from '@nestjs/common';
import { CreatorTrustLevel, Prisma } from '@smartklass/database';
import {
  canCreatorReceivePayouts,
  defaultPayoutDelayForTrustLevel,
  resolvePayoutDelayDays,
} from '@smartklass/shared';
import { PrismaService } from '../../common/database/prisma.service';

@Injectable()
export class CreatorPayoutPolicyService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateRiskProfile(creatorProfileId: string) {
    const existing = await this.prisma.creatorRiskProfile.findUnique({
      where: { creatorProfileId },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.creatorRiskProfile.create({
      data: {
        creatorProfileId,
        trustLevel: CreatorTrustLevel.NEW,
        payoutDelayDays: defaultPayoutDelayForTrustLevel('NEW') ?? 30,
      },
    });
  }

  async resolveDelayDays(creatorProfileId: string): Promise<number | null> {
    const profile = await this.getOrCreateRiskProfile(creatorProfileId);
    return resolvePayoutDelayDays({
      trustLevel: profile.trustLevel,
      payoutDelayDays: profile.payoutDelayDays,
    });
  }

  async canReceivePayouts(creatorProfileId: string): Promise<boolean> {
    const profile = await this.getOrCreateRiskProfile(creatorProfileId);
    return canCreatorReceivePayouts(profile.trustLevel);
  }

  async refreshRiskMetrics(creatorProfileId: string) {
    const [sales, refunds, disputes] = await Promise.all([
      this.prisma.creatorTransaction.aggregate({
        where: { creatorProfileId },
        _sum: { grossAmountCents: true },
        _count: true,
      }),
      this.prisma.refund.count({
        where: {
          creatorTransaction: { creatorProfileId },
          status: 'SUCCEEDED',
        },
      }),
      this.prisma.dispute.count({
        where: {
          creatorTransaction: { creatorProfileId },
        },
      }),
    ]);

    const transactionCount = sales._count;
    const refundRate = transactionCount > 0 ? refunds / transactionCount : 0;
    const disputeRate = transactionCount > 0 ? disputes / transactionCount : 0;

    return this.prisma.creatorRiskProfile.upsert({
      where: { creatorProfileId },
      create: {
        creatorProfileId,
        trustLevel: CreatorTrustLevel.NEW,
        payoutDelayDays: 30,
        lifetimeSalesCents: sales._sum.grossAmountCents ?? 0,
        refundRate,
        disputeRate,
      },
      update: {
        lifetimeSalesCents: sales._sum.grossAmountCents ?? 0,
        refundRate,
        disputeRate,
      },
    });
  }

  buildAvailableAt(paidAt: Date, delayDays: number): Date {
    const availableAt = new Date(paidAt);
    availableAt.setDate(availableAt.getDate() + delayDays);
    return availableAt;
  }

  riskSnapshot(profile: {
    trustLevel: CreatorTrustLevel;
    payoutDelayDays: number;
    manualReviewRequired: boolean;
    disputeRate: number;
    refundRate: number;
    lifetimeSalesCents: number;
    notes: string | null;
  }): Prisma.JsonObject {
    return {
      trustLevel: profile.trustLevel,
      payoutDelayDays: profile.payoutDelayDays,
      manualReviewRequired: profile.manualReviewRequired,
      disputeRate: profile.disputeRate,
      refundRate: profile.refundRate,
      lifetimeSalesCents: profile.lifetimeSalesCents,
      notes: profile.notes,
    };
  }
}
