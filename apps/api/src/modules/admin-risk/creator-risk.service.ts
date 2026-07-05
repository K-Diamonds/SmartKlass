import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AdminAuditTargetType,
  CreatorTrustLevel,
  Prisma,
} from '@smartklass/database';
import {
  HIGH_RISK_PAYOUT_DELAY_OPTIONS,
  TRUSTED_PAYOUT_DELAY_OPTIONS,
  defaultPayoutDelayForTrustLevel,
  resolvePayoutDelayDays,
} from '@smartklass/shared';
import { PrismaService } from '../../common/database/prisma.service';
import { CreatorPayoutPolicyService } from '../billing/creator-payout-policy.service';
import { CreatorBillingService } from '../billing/creator-billing.service';
import { AdminAuditService, auditSnapshot } from './admin-audit.service';

type AdminActorContext = {
  actorUserId: string;
  ipAddress?: string | null;
  reason?: string | null;
};

@Injectable()
export class CreatorRiskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payoutPolicy: CreatorPayoutPolicyService,
    private readonly creatorBilling: CreatorBillingService,
    private readonly audit: AdminAuditService,
  ) {}

  async getRiskProfile(creatorProfileId: string) {
    await this.payoutPolicy.refreshRiskMetrics(creatorProfileId);
    return this.payoutPolicy.getOrCreateRiskProfile(creatorProfileId);
  }

  async listRiskEvents(creatorProfileId: string, limit = 50) {
    return this.prisma.creatorRiskEvent.findMany({
      where: { creatorProfileId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  private async recordRiskEvent(
    creatorProfileId: string,
    eventType: string,
    description: string,
    severity: 'info' | 'warning' | 'critical' = 'info',
    metadata?: Prisma.JsonValue,
  ) {
    return this.prisma.creatorRiskEvent.create({
      data: {
        creatorProfileId,
        eventType,
        description,
        severity,
        metadata: metadata ?? undefined,
      },
    });
  }

  private async updateRiskProfile(
    creatorProfileId: string,
    data: Prisma.CreatorRiskProfileUpdateInput,
    context: AdminActorContext,
    action: string,
  ) {
    const before = await this.payoutPolicy.getOrCreateRiskProfile(creatorProfileId);
    const after = await this.prisma.creatorRiskProfile.update({
      where: { creatorProfileId },
      data,
    });

    await this.audit.log({
      actorUserId: context.actorUserId,
      action,
      targetType: AdminAuditTargetType.CREATOR_PROFILE,
      targetId: creatorProfileId,
      before: this.payoutPolicy.riskSnapshot(before),
      after: this.payoutPolicy.riskSnapshot(after),
      reason: context.reason,
      ipAddress: context.ipAddress,
    });

    await this.creatorBilling.syncConnectPayoutScheduleForCreator(
      creatorProfileId,
    );

    return after;
  }

  async suspendCreator(creatorProfileId: string, context: AdminActorContext) {
    await this.prisma.creatorProfile.update({
      where: { id: creatorProfileId },
      data: { isActive: false },
    });

    const profile = await this.updateRiskProfile(
      creatorProfileId,
      {
        trustLevel: CreatorTrustLevel.SUSPENDED,
        manualReviewRequired: true,
      },
      context,
      'suspend_creator',
    );

    await this.recordRiskEvent(
      creatorProfileId,
      'creator_suspended',
      context.reason ?? 'Creator suspended by admin.',
      'critical',
    );

    return profile;
  }

  async markTrusted(
    creatorProfileId: string,
    context: AdminActorContext,
    payoutDelayDays?: number,
  ) {
    const delay =
      payoutDelayDays && TRUSTED_PAYOUT_DELAY_OPTIONS.includes(payoutDelayDays as 7 | 14)
        ? payoutDelayDays
        : defaultPayoutDelayForTrustLevel('TRUSTED')!;

    return this.updateRiskProfile(
      creatorProfileId,
      {
        trustLevel: CreatorTrustLevel.TRUSTED,
        payoutDelayDays: delay,
        manualReviewRequired: false,
      },
      context,
      'mark_creator_trusted',
    );
  }

  async markHighRisk(
    creatorProfileId: string,
    context: AdminActorContext,
    payoutDelayDays?: number,
  ) {
    const delay =
      payoutDelayDays &&
      HIGH_RISK_PAYOUT_DELAY_OPTIONS.includes(payoutDelayDays as 45 | 60)
        ? payoutDelayDays
        : defaultPayoutDelayForTrustLevel('HIGH_RISK')!;

    return this.updateRiskProfile(
      creatorProfileId,
      {
        trustLevel: CreatorTrustLevel.HIGH_RISK,
        payoutDelayDays: delay,
        manualReviewRequired: true,
      },
      context,
      'mark_creator_high_risk',
    );
  }

  async extendPayoutHold(
    creatorProfileId: string,
    additionalDays: number,
    context: AdminActorContext,
  ) {
    const profile = await this.payoutPolicy.getOrCreateRiskProfile(
      creatorProfileId,
    );
    const newDelay = profile.payoutDelayDays + additionalDays;

    const updated = await this.updateRiskProfile(
      creatorProfileId,
      { payoutDelayDays: newDelay },
      context,
      'extend_payout_hold',
    );

    const pending = await this.prisma.creatorTransaction.findMany({
      where: {
        creatorProfileId,
        status: 'PENDING',
        availableAt: { not: null },
      },
      select: { id: true, availableAt: true },
    });

    for (const transaction of pending) {
      if (!transaction.availableAt) {
        continue;
      }
      const extended = new Date(transaction.availableAt);
      extended.setDate(extended.getDate() + additionalDays);
      await this.prisma.creatorTransaction.update({
        where: { id: transaction.id },
        data: { availableAt: extended },
      });
    }

    await this.recordRiskEvent(
      creatorProfileId,
      'payout_hold_extended',
      `Extended payout hold by ${additionalDays} days.`,
      'warning',
      { additionalDays, newDelay },
    );

    return updated;
  }

  async revokeCourseAccess(
    userId: string,
    courseId: string,
    context: AdminActorContext,
  ) {
    const access = await this.prisma.courseAccess.findFirst({
      where: {
        userId,
        courseId,
        revokedAt: null,
      },
    });

    if (!access) {
      throw new NotFoundException('Active course access not found.');
    }

    const updated = await this.prisma.courseAccess.update({
      where: { id: access.id },
      data: { revokedAt: new Date() },
    });

    await this.audit.log({
      actorUserId: context.actorUserId,
      action: 'revoke_course_access',
      targetType: AdminAuditTargetType.COURSE_ACCESS,
      targetId: access.id,
      before: { revokedAt: null },
      after: { revokedAt: updated.revokedAt?.toISOString() ?? null },
      reason: context.reason,
      ipAddress: context.ipAddress,
    });

    return updated;
  }

  async approveRefund(refundId: string, context: AdminActorContext) {
    const refund = await this.prisma.refund.findUnique({
      where: { id: refundId },
    });

    if (!refund) {
      throw new NotFoundException('Refund not found.');
    }

    const updated = await this.prisma.refund.update({
      where: { id: refundId },
      data: {
        adminApprovedAt: new Date(),
        adminApprovedByUserId: context.actorUserId,
      },
    });

    await this.audit.log({
      actorUserId: context.actorUserId,
      action: 'approve_refund',
      targetType: AdminAuditTargetType.REFUND,
      targetId: refundId,
      before: auditSnapshot({
        adminApprovedAt: refund.adminApprovedAt,
        adminApprovedByUserId: refund.adminApprovedByUserId,
      }),
      after: auditSnapshot({
        adminApprovedAt: updated.adminApprovedAt,
        adminApprovedByUserId: updated.adminApprovedByUserId,
      }),
      reason: context.reason,
      ipAddress: context.ipAddress,
    });

    return updated;
  }

  async flagTransaction(
    transactionId: string,
    flagReason: string,
    context: AdminActorContext,
  ) {
    const transaction = await this.prisma.creatorTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundException('Creator transaction not found.');
    }

    const updated = await this.prisma.creatorTransaction.update({
      where: { id: transactionId },
      data: {
        adminFlaggedAt: new Date(),
        adminFlagReason: flagReason,
      },
    });

    await this.audit.log({
      actorUserId: context.actorUserId,
      action: 'flag_transaction',
      targetType: AdminAuditTargetType.CREATOR_TRANSACTION,
      targetId: transactionId,
      before: auditSnapshot({
        adminFlaggedAt: transaction.adminFlaggedAt,
        adminFlagReason: transaction.adminFlagReason,
      }),
      after: auditSnapshot({
        adminFlaggedAt: updated.adminFlaggedAt,
        adminFlagReason: updated.adminFlagReason,
      }),
      reason: context.reason ?? flagReason,
      ipAddress: context.ipAddress,
    });

    if (transaction.creatorProfileId) {
      await this.recordRiskEvent(
        transaction.creatorProfileId,
        'transaction_flagged',
        flagReason,
        'warning',
        { transactionId },
      );
    }

    return updated;
  }

  async addInternalNote(
    creatorProfileId: string,
    note: string,
    context: AdminActorContext,
  ) {
    const profile = await this.payoutPolicy.getOrCreateRiskProfile(
      creatorProfileId,
    );
    const mergedNote = profile.notes
      ? `${profile.notes}\n\n[${new Date().toISOString()}] ${note}`
      : `[${new Date().toISOString()}] ${note}`;

    return this.updateRiskProfile(
      creatorProfileId,
      { notes: mergedNote },
      context,
      'add_internal_note',
    );
  }

  async updateDisputeEvidence(
    disputeId: string,
    input: {
      evidenceNotes?: string;
      markSubmitted?: boolean;
      assignedAdminUserId?: string;
    },
    context: AdminActorContext,
  ) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found.');
    }

    const updated = await this.prisma.dispute.update({
      where: { id: disputeId },
      data: {
        evidenceNotes: input.evidenceNotes ?? dispute.evidenceNotes,
        evidenceSubmittedAt: input.markSubmitted
          ? new Date()
          : dispute.evidenceSubmittedAt,
        assignedAdminUserId:
          input.assignedAdminUserId ?? context.actorUserId,
      },
    });

    await this.audit.log({
      actorUserId: context.actorUserId,
      action: 'update_dispute_evidence',
      targetType: AdminAuditTargetType.DISPUTE,
      targetId: disputeId,
      before: auditSnapshot({
        evidenceNotes: dispute.evidenceNotes,
        evidenceSubmittedAt: dispute.evidenceSubmittedAt,
        assignedAdminUserId: dispute.assignedAdminUserId,
      }),
      after: auditSnapshot({
        evidenceNotes: updated.evidenceNotes,
        evidenceSubmittedAt: updated.evidenceSubmittedAt,
        assignedAdminUserId: updated.assignedAdminUserId,
      }),
      reason: context.reason,
      ipAddress: context.ipAddress,
    });

    return updated;
  }

  validatePayoutDelayForTrustLevel(
    trustLevel: CreatorTrustLevel,
    payoutDelayDays: number,
  ) {
    const resolved = resolvePayoutDelayDays({ trustLevel, payoutDelayDays });
    if (resolved == null) {
      throw new BadRequestException('Suspended creators cannot receive payouts.');
    }
    return resolved;
  }
}
