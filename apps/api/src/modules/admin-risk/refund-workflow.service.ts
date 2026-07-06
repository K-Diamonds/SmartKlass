import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AdminAuditTargetType,
  PaymentStatus,
  Prisma,
  RefundRequestStatus,
} from '@smartklass/database';
import { PrismaService } from '../../common/database/prisma.service';
import { MetricsService } from '../../common/observability/metrics.service';
import { MarketplaceAccountingService } from '../billing/marketplace-accounting.service';
import { StripeClientService } from '../billing/stripe-client.service';
import { AdminAuditService, auditSnapshot } from './admin-audit.service';

type AdminActorContext = {
  actorUserId: string;
  reason: string;
  ipAddress?: string | null;
};

@Injectable()
export class RefundWorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeClient: StripeClientService,
    private readonly marketplaceAccounting: MarketplaceAccountingService,
    private readonly audit: AdminAuditService,
    private readonly metrics: MetricsService,
  ) {}

  async list(query: {
    page?: number;
    limit?: number;
    status?: RefundRequestStatus;
    paymentId?: string;
    creatorProfileId?: string;
    from?: Date;
    to?: Date;
  }) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.RefundRequestWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.paymentId ? { paymentId: query.paymentId } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: query.from } : {}),
              ...(query.to ? { lte: query.to } : {}),
            },
          }
        : {}),
      ...(query.creatorProfileId
        ? {
            creatorTransaction: {
              creatorProfileId: query.creatorProfileId,
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.refundRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          payment: {
            select: {
              id: true,
              amountCents: true,
              stripeChargeId: true,
              user: { select: { email: true } },
            },
          },
          requester: { select: { id: true, email: true } },
          approver: { select: { id: true, email: true } },
          denier: { select: { id: true, email: true } },
          executor: { select: { id: true, email: true } },
          creatorTransaction: {
            select: {
              id: true,
              creatorProfile: { select: { id: true, displayName: true } },
            },
          },
        },
      }),
      this.prisma.refundRequest.count({ where }),
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async getById(id: string) {
    const request = await this.prisma.refundRequest.findUnique({
      where: { id },
      include: {
        payment: true,
        creatorTransaction: true,
        requester: { select: { id: true, email: true } },
        approver: { select: { id: true, email: true } },
        denier: { select: { id: true, email: true } },
        executor: { select: { id: true, email: true } },
        refund: true,
      },
    });
    if (!request) {
      throw new NotFoundException('Refund request not found.');
    }
    return request;
  }

  async requestRefund(
    input: {
      paymentId: string;
      amountCents: number;
      reason: string;
    },
    context: AdminActorContext,
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: input.paymentId },
      include: { creatorTransaction: true },
    });

    if (!payment || payment.status !== PaymentStatus.SUCCEEDED) {
      throw new BadRequestException(
        'Payment must be succeeded to request refund.',
      );
    }

    if (input.amountCents <= 0 || input.amountCents > payment.amountCents) {
      throw new BadRequestException('Invalid refund amount.');
    }

    const request = await this.prisma.refundRequest.create({
      data: {
        paymentId: payment.id,
        creatorTransactionId: payment.creatorTransaction?.id,
        requestedByUserId: context.actorUserId,
        amountCents: input.amountCents,
        currency: payment.currency,
        reason: input.reason,
        status: RefundRequestStatus.REQUESTED,
      },
    });

    await this.audit.log({
      actorUserId: context.actorUserId,
      action: 'refund_request_created',
      targetType: AdminAuditTargetType.REFUND_REQUEST,
      targetId: request.id,
      after: auditSnapshot({
        status: request.status,
        amountCents: request.amountCents,
        paymentId: request.paymentId,
      }),
      reason: context.reason,
      ipAddress: context.ipAddress,
    });

    return request;
  }

  async approve(id: string, context: AdminActorContext) {
    const existing = await this.getById(id);
    if (existing.status !== RefundRequestStatus.REQUESTED) {
      throw new BadRequestException('Only REQUESTED refunds can be approved.');
    }

    const updated = await this.prisma.refundRequest.update({
      where: { id },
      data: {
        status: RefundRequestStatus.APPROVED,
        approvedAt: new Date(),
        approvedByUserId: context.actorUserId,
      },
    });

    await this.audit.log({
      actorUserId: context.actorUserId,
      action: 'refund_request_approved',
      targetType: AdminAuditTargetType.REFUND_REQUEST,
      targetId: id,
      before: auditSnapshot({ status: existing.status }),
      after: auditSnapshot({ status: updated.status }),
      reason: context.reason,
      ipAddress: context.ipAddress,
    });

    return updated;
  }

  async deny(id: string, denialReason: string, context: AdminActorContext) {
    const existing = await this.getById(id);
    if (
      existing.status !== RefundRequestStatus.REQUESTED &&
      existing.status !== RefundRequestStatus.APPROVED
    ) {
      throw new BadRequestException(
        'Refund request cannot be denied in current state.',
      );
    }

    const updated = await this.prisma.refundRequest.update({
      where: { id },
      data: {
        status: RefundRequestStatus.DENIED,
        deniedAt: new Date(),
        deniedByUserId: context.actorUserId,
        denialReason,
      },
    });

    await this.audit.log({
      actorUserId: context.actorUserId,
      action: 'refund_request_denied',
      targetType: AdminAuditTargetType.REFUND_REQUEST,
      targetId: id,
      before: auditSnapshot({ status: existing.status }),
      after: auditSnapshot({ status: updated.status, denialReason }),
      reason: context.reason,
      ipAddress: context.ipAddress,
    });

    return updated;
  }

  async execute(id: string, context: AdminActorContext) {
    const existing = await this.getById(id);
    if (existing.status !== RefundRequestStatus.APPROVED) {
      throw new BadRequestException(
        'Refund must be APPROVED before execution. Approval and Stripe execution are separate steps.',
      );
    }

    if (!this.stripeClient.isConfigured()) {
      throw new BadRequestException('Stripe is not configured.');
    }

    const payment = existing.payment;
    if (!payment?.stripeChargeId) {
      throw new BadRequestException('Payment has no Stripe charge ID.');
    }

    await this.prisma.refundRequest.update({
      where: { id },
      data: { status: RefundRequestStatus.EXECUTING },
    });

    try {
      const stripe = this.stripeClient.getClient();
      const stripeRefund = await stripe.refunds.create({
        charge: payment.stripeChargeId,
        amount: existing.amountCents,
        reason: 'requested_by_customer',
        metadata: {
          refundRequestId: id,
          adminReason: context.reason,
        },
      });

      await this.marketplaceAccounting.syncRefundFromStripe(stripeRefund);

      const ledgerRefund = await this.prisma.refund.findUnique({
        where: { stripeRefundId: stripeRefund.id },
      });

      const updated = await this.prisma.refundRequest.update({
        where: { id },
        data: {
          status: RefundRequestStatus.EXECUTED,
          executedAt: new Date(),
          executedByUserId: context.actorUserId,
          stripeRefundId: stripeRefund.id,
          refundId: ledgerRefund?.id,
        },
      });

      await this.audit.log({
        actorUserId: context.actorUserId,
        action: 'refund_request_executed',
        targetType: AdminAuditTargetType.REFUND_REQUEST,
        targetId: id,
        before: auditSnapshot({ status: RefundRequestStatus.EXECUTING }),
        after: auditSnapshot({
          status: updated.status,
          stripeRefundId: stripeRefund.id,
        }),
        reason: context.reason,
        ipAddress: context.ipAddress,
      });

      return updated;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Stripe refund failed.';
      this.metrics.increment('refund_failures_total');
      await this.prisma.refundRequest.update({
        where: { id },
        data: {
          status: RefundRequestStatus.FAILED,
          executionError: message,
        },
      });
      throw new BadRequestException(message);
    }
  }

  async getAuditTrail(refundRequestId: string) {
    return this.prisma.adminAuditLog.findMany({
      where: {
        targetType: AdminAuditTargetType.REFUND_REQUEST,
        targetId: refundRequestId,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        actor: {
          select: {
            id: true,
            email: true,
            profile: { select: { displayName: true } },
          },
        },
      },
    });
  }
}
