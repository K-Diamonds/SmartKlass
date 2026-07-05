import { Injectable, Logger } from '@nestjs/common';
import {
  CreatorPayoutStatus,
  CreatorTransactionStatus,
  CreatorTransactionType,
  DisputeStatus,
  PaymentStatus,
  Prisma,
  RefundStatus,
} from '@smartklass/database';
import {
  CREATOR_PAYOUT_DELAY_DAYS,
  calculatePlatformFee,
} from '@smartklass/shared';
import { PrismaService } from '../../common/database/prisma.service';
import { mergeJsonMetadata, metadataNumber, metadataString } from './merge-metadata';
import Stripe from 'stripe';

export type CreatorLedgerBalances = {
  pendingCents: number;
  availableCents: number;
  paidOutCents: number;
  refundedCents: number;
  disputedCents: number;
  currency: string;
};

type RecordSaleInput = {
  paymentId: string;
  creatorProfileId: string;
  courseId: string;
  accessPlanId: string;
  userId: string;
  type: CreatorTransactionType;
  grossAmountCents: number;
  platformFeeCents: number;
  creatorNetCents: number;
  feeRuleLabel?: string;
  currency: string;
  paidAt?: Date;
  stripePaymentIntentId?: string | null;
  stripeChargeId?: string | null;
  stripeBalanceTransactionId?: string | null;
  stripeInvoiceId?: string | null;
  stripeFeeCents?: number | null;
};

@Injectable()
export class MarketplaceAccountingService {
  private readonly logger = new Logger(MarketplaceAccountingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async recordSaleFromPaymentMetadata(
    tx: Prisma.TransactionClient,
    input: {
      paymentId: string;
      creatorProfileId: string;
      courseId: string;
      accessPlanId: string;
      userId: string;
      type: CreatorTransactionType;
      grossAmountCents: number;
      currency: string;
      metadata: Prisma.JsonValue | null | undefined;
      paidAt?: Date;
      stripePaymentIntentId?: string | null;
      stripeChargeId?: string | null;
      stripeBalanceTransactionId?: string | null;
      stripeInvoiceId?: string | null;
      stripeFeeCents?: number | null;
    },
  ) {
    const feeBreakdown = calculatePlatformFee(input.grossAmountCents);
    const platformFeeCents =
      metadataNumber(input.metadata, 'platformFeeCents') ??
      feeBreakdown.platformFeeCents;
    const creatorNetCents =
      metadataNumber(input.metadata, 'creatorNetCents') ??
      metadataNumber(input.metadata, 'creatorEarningsCents') ??
      Math.max(input.grossAmountCents - platformFeeCents, 0);
    const feeRuleLabel =
      metadataString(input.metadata, 'feeRuleLabel') ?? feeBreakdown.feeRuleLabel;

    return this.recordSale(tx, {
      ...input,
      platformFeeCents,
      creatorNetCents,
      feeRuleLabel,
    });
  }

  async recordSale(tx: Prisma.TransactionClient, input: RecordSaleInput) {
    const existing = await tx.creatorTransaction.findFirst({
      where: {
        OR: [
          { paymentId: input.paymentId },
          ...(input.stripePaymentIntentId
            ? [{ stripePaymentIntentId: input.stripePaymentIntentId }]
            : []),
          ...(input.stripeChargeId
            ? [{ stripeChargeId: input.stripeChargeId }]
            : []),
        ],
      },
    });

    if (existing) {
      return existing;
    }

    const paidAt = input.paidAt ?? new Date();
    const availableAt = new Date(paidAt);
    availableAt.setDate(availableAt.getDate() + CREATOR_PAYOUT_DELAY_DAYS);

    const transaction = await tx.creatorTransaction.create({
      data: {
        creatorProfileId: input.creatorProfileId,
        paymentId: input.paymentId,
        courseId: input.courseId,
        accessPlanId: input.accessPlanId,
        userId: input.userId,
        type: input.type,
        status: CreatorTransactionStatus.PENDING,
        grossAmountCents: input.grossAmountCents,
        platformFeeCents: input.platformFeeCents,
        stripeFeeCents: input.stripeFeeCents ?? undefined,
        creatorNetCents: input.creatorNetCents,
        currency: input.currency,
        stripePaymentIntentId: input.stripePaymentIntentId ?? undefined,
        stripeChargeId: input.stripeChargeId ?? undefined,
        stripeBalanceTransactionId: input.stripeBalanceTransactionId ?? undefined,
        stripeInvoiceId: input.stripeInvoiceId ?? undefined,
        availableAt,
        metadata: mergeJsonMetadata(null, {
          feeRuleLabel: input.feeRuleLabel ?? null,
          payoutDelayDays: CREATOR_PAYOUT_DELAY_DAYS,
        }),
      },
    });

    this.logger.log(
      `Recorded creator transaction ${transaction.id} (PENDING until ${availableAt.toISOString()})`,
    );

    return transaction;
  }

  async promoteMaturedTransactions(
    creatorProfileId?: string,
    asOf: Date = new Date(),
  ): Promise<number> {
    const result = await this.prisma.creatorTransaction.updateMany({
      where: {
        status: CreatorTransactionStatus.PENDING,
        availableAt: { lte: asOf },
        ...(creatorProfileId ? { creatorProfileId } : {}),
      },
      data: {
        status: CreatorTransactionStatus.AVAILABLE,
      },
    });

    return result.count;
  }

  async getLedgerBalances(
    creatorProfileId: string,
    currency = 'USD',
  ): Promise<CreatorLedgerBalances> {
    await this.promoteMaturedTransactions(creatorProfileId);

    const transactions = await this.prisma.creatorTransaction.findMany({
      where: { creatorProfileId, currency },
      select: {
        status: true,
        creatorNetCents: true,
      },
    });

    const sum = (statuses: CreatorTransactionStatus[]) =>
      transactions
        .filter((row) => statuses.includes(row.status))
        .reduce((total, row) => total + row.creatorNetCents, 0);

    return {
      pendingCents: sum([CreatorTransactionStatus.PENDING]),
      availableCents: sum([CreatorTransactionStatus.AVAILABLE]),
      paidOutCents: sum([CreatorTransactionStatus.PAID_OUT]),
      refundedCents: sum([CreatorTransactionStatus.REFUNDED]),
      disputedCents: sum([
        CreatorTransactionStatus.DISPUTED,
        CreatorTransactionStatus.REVERSED,
      ]),
      currency,
    };
  }

  async syncRefundFromStripe(refund: Stripe.Refund) {
    const chargeId =
      typeof refund.charge === 'string' ? refund.charge : refund.charge?.id;

    const transaction = chargeId
      ? await this.prisma.creatorTransaction.findFirst({
          where: { stripeChargeId: chargeId },
        })
      : null;

    const payment = chargeId
      ? await this.prisma.payment.findFirst({
          where: { stripeChargeId: chargeId },
        })
      : transaction?.paymentId
        ? await this.prisma.payment.findUnique({
            where: { id: transaction.paymentId },
          })
        : null;

    const status = this.mapRefundStatus(refund.status);

    await this.prisma.$transaction(async (tx) => {
      await tx.refund.upsert({
        where: { stripeRefundId: refund.id },
        create: {
          stripeRefundId: refund.id,
          stripeChargeId: chargeId,
          creatorTransactionId: transaction?.id,
          paymentId: payment?.id ?? transaction?.paymentId,
          amountCents: refund.amount,
          currency: refund.currency.toUpperCase(),
          status,
          reason: refund.reason ?? undefined,
        },
        update: {
          amountCents: refund.amount,
          currency: refund.currency.toUpperCase(),
          status,
          reason: refund.reason ?? undefined,
        },
      });

      if (status === RefundStatus.SUCCEEDED) {
        if (transaction) {
          await tx.creatorTransaction.update({
            where: { id: transaction.id },
            data: { status: CreatorTransactionStatus.REFUNDED },
          });
        }

        if (payment) {
          await tx.payment.update({
            where: { id: payment.id },
            data: { status: PaymentStatus.REFUNDED },
          });
        }
      }
    });
  }

  async syncDisputeFromStripe(dispute: Stripe.Dispute) {
    const chargeId =
      typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id;

    if (!chargeId) {
      return;
    }

    const transaction = await this.prisma.creatorTransaction.findFirst({
      where: { stripeChargeId: chargeId },
    });

    const payment = transaction?.paymentId
      ? await this.prisma.payment.findUnique({
          where: { id: transaction.paymentId },
        })
      : await this.prisma.payment.findFirst({
          where: { stripeChargeId: chargeId },
        });

    await this.prisma.dispute.upsert({
      where: { stripeDisputeId: dispute.id },
      create: {
        stripeDisputeId: dispute.id,
        stripeChargeId: chargeId,
        creatorTransactionId: transaction?.id,
        paymentId: payment?.id ?? transaction?.paymentId,
        amountCents: dispute.amount,
        currency: dispute.currency.toUpperCase(),
        status: this.mapDisputeStatus(dispute.status),
        reason: dispute.reason ?? undefined,
      },
      update: {
        amountCents: dispute.amount,
        currency: dispute.currency.toUpperCase(),
        status: this.mapDisputeStatus(dispute.status),
        reason: dispute.reason ?? undefined,
        paymentId: payment?.id ?? transaction?.paymentId,
        creatorTransactionId: transaction?.id,
      },
    });

    if (transaction) {
      await this.prisma.creatorTransaction.update({
        where: { id: transaction.id },
        data: { status: CreatorTransactionStatus.DISPUTED },
      });
    }
  }

  async closeDisputeFromStripe(dispute: Stripe.Dispute) {
    const chargeId =
      typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id;

    if (!chargeId) {
      return;
    }

    const status = this.mapDisputeStatus(dispute.status);
    const transaction = await this.prisma.creatorTransaction.findFirst({
      where: { stripeChargeId: chargeId },
    });

    await this.prisma.dispute.update({
      where: { stripeDisputeId: dispute.id },
      data: {
        status,
        reason: dispute.reason ?? undefined,
        closedAt: new Date(),
      },
    });

    if (!transaction) {
      return;
    }

    if (status === DisputeStatus.WON || status === DisputeStatus.WARNING_CLOSED) {
      const nextStatus =
        transaction.availableAt && transaction.availableAt <= new Date()
          ? CreatorTransactionStatus.AVAILABLE
          : CreatorTransactionStatus.PENDING;

      await this.prisma.creatorTransaction.update({
        where: { id: transaction.id },
        data: { status: nextStatus },
      });
      return;
    }

    if (status === DisputeStatus.LOST) {
      await this.prisma.creatorTransaction.update({
        where: { id: transaction.id },
        data: { status: CreatorTransactionStatus.REVERSED },
      });
    }
  }

  async syncPayoutFromStripe(
    payout: Stripe.Payout,
    stripeConnectAccountId: string,
  ) {
    const profile = await this.prisma.creatorProfile.findFirst({
      where: {
        stripeConnectAccountId,
        deletedAt: null,
      },
    });

    if (!profile) {
      this.logger.warn(
        `Ignoring payout ${payout.id} — no creator profile for account ${stripeConnectAccountId}.`,
      );
      return;
    }

    const status = this.mapPayoutStatus(payout.status);
    const scheduledFor = payout.arrival_date
      ? new Date(payout.arrival_date * 1000)
      : null;
    const paidAt =
      status === CreatorPayoutStatus.PAID && payout.arrival_date
        ? new Date(payout.arrival_date * 1000)
        : null;

    await this.prisma.creatorPayout.upsert({
      where: { stripePayoutId: payout.id },
      create: {
        creatorProfileId: profile.id,
        stripePayoutId: payout.id,
        amountCents: payout.amount,
        currency: payout.currency.toUpperCase(),
        status,
        scheduledFor,
        paidAt,
        failureReason: payout.failure_message ?? undefined,
        metadata: mergeJsonMetadata(null, {
          stripeConnectAccountId,
          stripeStatus: payout.status,
        }),
      },
      update: {
        amountCents: payout.amount,
        currency: payout.currency.toUpperCase(),
        status,
        scheduledFor,
        paidAt,
        failureReason: payout.failure_message ?? undefined,
        metadata: mergeJsonMetadata(null, {
          stripeConnectAccountId,
          stripeStatus: payout.status,
        }),
      },
    });

    if (status === CreatorPayoutStatus.PAID) {
      await this.promoteMaturedTransactions(profile.id);
      await this.markTransactionsPaidOut(profile.id, payout.amount, paidAt ?? new Date());
    }
  }

  async syncPayoutFailedFromStripe(
    payout: Stripe.Payout,
    stripeConnectAccountId: string,
  ) {
    await this.syncPayoutFromStripe(payout, stripeConnectAccountId);
  }

  private async markTransactionsPaidOut(
    creatorProfileId: string,
    payoutAmountCents: number,
    paidOutAt: Date,
  ) {
    let remaining = payoutAmountCents;

    const available = await this.prisma.creatorTransaction.findMany({
      where: {
        creatorProfileId,
        status: CreatorTransactionStatus.AVAILABLE,
      },
      orderBy: { availableAt: 'asc' },
    });

    for (const transaction of available) {
      if (remaining <= 0) {
        break;
      }

      if (transaction.creatorNetCents <= remaining) {
        await this.prisma.creatorTransaction.update({
          where: { id: transaction.id },
          data: {
            status: CreatorTransactionStatus.PAID_OUT,
            paidOutAt,
          },
        });
        remaining -= transaction.creatorNetCents;
      }
    }
  }

  async attachChargeToPayment(
    paymentId: string,
    stripeChargeId: string,
    stripePaymentIntentId?: string | null,
    stripeBalanceTransactionId?: string | null,
  ) {
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        stripeChargeId,
        ...(stripePaymentIntentId ? { stripePaymentIntentId } : {}),
      },
    });

    const transaction = await this.prisma.creatorTransaction.findFirst({
      where: {
        OR: [
          { paymentId },
          ...(stripePaymentIntentId
            ? [{ stripePaymentIntentId }]
            : []),
        ],
      },
    });

    if (transaction) {
      await this.prisma.creatorTransaction.update({
        where: { id: transaction.id },
        data: {
          ...(transaction.stripeChargeId ? {} : { stripeChargeId }),
          ...(stripeBalanceTransactionId
            ? { stripeBalanceTransactionId }
            : {}),
        },
      });
    }
  }

  private mapRefundStatus(
    status: Stripe.Refund['status'] | null,
  ): RefundStatus {
    switch (status) {
      case 'succeeded':
        return RefundStatus.SUCCEEDED;
      case 'failed':
        return RefundStatus.FAILED;
      case 'canceled':
        return RefundStatus.CANCELED;
      default:
        return RefundStatus.PENDING;
    }
  }

  private mapDisputeStatus(status: Stripe.Dispute.Status): DisputeStatus {
    switch (status) {
      case 'warning_needs_response':
        return DisputeStatus.WARNING_NEEDS_RESPONSE;
      case 'warning_under_review':
        return DisputeStatus.WARNING_UNDER_REVIEW;
      case 'warning_closed':
        return DisputeStatus.WARNING_CLOSED;
      case 'needs_response':
        return DisputeStatus.NEEDS_RESPONSE;
      case 'under_review':
        return DisputeStatus.UNDER_REVIEW;
      case 'won':
        return DisputeStatus.WON;
      case 'lost':
        return DisputeStatus.LOST;
      default:
        return DisputeStatus.UNDER_REVIEW;
    }
  }

  private mapPayoutStatus(status: Stripe.Payout['status']): CreatorPayoutStatus {
    switch (status) {
      case 'pending':
        return CreatorPayoutStatus.PENDING;
      case 'in_transit':
        return CreatorPayoutStatus.PROCESSING;
      case 'paid':
        return CreatorPayoutStatus.PAID;
      case 'failed':
        return CreatorPayoutStatus.FAILED;
      case 'canceled':
        return CreatorPayoutStatus.CANCELED;
      default:
        return CreatorPayoutStatus.PENDING;
    }
  }
}
