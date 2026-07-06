import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  AdminAuditTargetType,
  PaymentStatus,
  ReconciliationReportStatus,
} from '@smartklass/database';
import { PrismaService } from '../../common/database/prisma.service';
import { StripeClientService } from '../billing/stripe-client.service';
import { AdminAuditService, auditSnapshot } from './admin-audit.service';
import { ReconciliationReportDto } from './dto/admin-risk.dto';
import { paginateStripeAuto } from './stripe-pagination.util';

type ReconciliationSummary = {
  localPaymentsCount: number;
  localPaymentsCents: number;
  localCreatorTransactionsCount: number;
  localCreatorNetCents: number;
  localPlatformFeeCents: number;
  stripeChargesCount: number;
  stripeChargesCents: number;
  stripeApplicationFeesCents: number;
  stripeTransfersCents: number;
  stripePayoutsCents: number;
};

type LineDiscrepancy = {
  code: string;
  objectType: 'payment' | 'charge' | 'creator_transaction' | 'transfer' | 'platform_fee' | 'payout';
  localId?: string;
  stripeId?: string;
  message: string;
  localCents?: number;
  stripeCents?: number;
  deltaCents?: number;
};

@Injectable()
export class StripeReconciliationService {
  private readonly logger = new Logger(StripeReconciliationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeClient: StripeClientService,
    private readonly audit: AdminAuditService,
  ) {}

  async listReports(limit = 20): Promise<ReconciliationReportDto[]> {
    const reports = await this.prisma.reconciliationReport.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return reports.map((report) => this.toDto(report));
  }

  async getReport(id: string): Promise<ReconciliationReportDto> {
    const report = await this.prisma.reconciliationReport.findUnique({
      where: { id },
    });
    if (!report) {
      throw new NotFoundException('Reconciliation report not found.');
    }
    return this.toDto(report);
  }

  async enqueueReport(
    periodStart: Date,
    periodEnd: Date,
    actorUserId: string,
    ipAddress?: string | null,
  ) {
    const report = await this.prisma.reconciliationReport.create({
      data: {
        periodStart,
        periodEnd,
        status: ReconciliationReportStatus.PENDING,
      },
    });

    await this.audit.log({
      actorUserId,
      action: 'enqueue_reconciliation',
      targetType: AdminAuditTargetType.RECONCILIATION_REPORT,
      targetId: report.id,
      after: auditSnapshot({ periodStart, periodEnd }),
      ipAddress,
    });

    void this.runReport(report.id);
    return this.toDto(report);
  }

  async runReport(reportId: string) {
    const report = await this.prisma.reconciliationReport.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      return;
    }

    await this.prisma.reconciliationReport.update({
      where: { id: reportId },
      data: {
        status: ReconciliationReportStatus.RUNNING,
        startedAt: new Date(),
      },
    });

    try {
      const built = await this.buildReconciliation(
        report.periodStart,
        report.periodEnd,
      );

      const localBalance = await this.prisma.creatorTransaction.aggregate({
        where: {
          createdAt: { gte: report.periodStart, lte: report.periodEnd },
        },
        _sum: { creatorNetCents: true },
      });

      let stripeBalanceCents: number | null = null;
      if (this.stripeClient.isConfigured()) {
        const stripe = this.stripeClient.getClient();
        const balance = await stripe.balance.retrieve();
        stripeBalanceCents = balance.available.reduce(
          (sum, entry) => sum + entry.amount,
          0,
        );
      }

      await this.prisma.reconciliationReport.update({
        where: { id: reportId },
        data: {
          status: ReconciliationReportStatus.COMPLETED,
          summary: built.summary,
          discrepancies: built.discrepancies,
          localBalanceCents: localBalance._sum.creatorNetCents ?? 0,
          stripeBalanceCents,
          completedAt: new Date(),
        },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Reconciliation failed.';
      this.logger.error(`Reconciliation ${reportId} failed: ${message}`);

      await this.prisma.reconciliationReport.update({
        where: { id: reportId },
        data: {
          status: ReconciliationReportStatus.FAILED,
          errorMessage: message,
          completedAt: new Date(),
        },
      });
    }
  }

  private async buildReconciliation(periodStart: Date, periodEnd: Date) {
    const [payments, transactions, payouts] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          status: PaymentStatus.SUCCEEDED,
          createdAt: { gte: periodStart, lte: periodEnd },
        },
        select: {
          id: true,
          amountCents: true,
          stripePaymentIntentId: true,
          stripeChargeId: true,
        },
      }),
      this.prisma.creatorTransaction.findMany({
        where: {
          createdAt: { gte: periodStart, lte: periodEnd },
        },
        select: {
          id: true,
          creatorNetCents: true,
          platformFeeCents: true,
          stripeChargeId: true,
          stripePaymentIntentId: true,
        },
      }),
      this.prisma.creatorPayout.findMany({
        where: {
          createdAt: { gte: periodStart, lte: periodEnd },
        },
        select: {
          id: true,
          amountCents: true,
          stripePayoutId: true,
          status: true,
        },
      }),
    ]);

    const created = {
      gte: Math.floor(periodStart.getTime() / 1000),
      lte: Math.floor(periodEnd.getTime() / 1000),
    };

    let stripeCharges: Array<{
      id: string;
      amount: number;
      application_fee_amount: number | null;
      payment_intent: string | { id: string } | null;
    }> = [];
    let stripeTransfers: Array<{
      id: string;
      amount: number;
      source_transaction: string | { id: string } | null;
    }> = [];
    let stripePayouts: Array<{ id: string; amount: number }> = [];

    if (this.stripeClient.isConfigured()) {
      const stripe = this.stripeClient.getClient();
      [stripeCharges, stripeTransfers, stripePayouts] = await Promise.all([
        paginateStripeAuto((params) =>
          stripe.charges.list({ ...params, created }),
        ),
        paginateStripeAuto((params) =>
          stripe.transfers.list({ ...params, created }),
        ),
        paginateStripeAuto((params) =>
          stripe.payouts.list({ ...params, created }),
        ),
      ]);
    }

    const summary: ReconciliationSummary = {
      localPaymentsCount: payments.length,
      localPaymentsCents: payments.reduce((s, p) => s + p.amountCents, 0),
      localCreatorTransactionsCount: transactions.length,
      localCreatorNetCents: transactions.reduce((s, t) => s + t.creatorNetCents, 0),
      localPlatformFeeCents: transactions.reduce((s, t) => s + t.platformFeeCents, 0),
      stripeChargesCount: stripeCharges.length,
      stripeChargesCents: stripeCharges.reduce((s, c) => s + c.amount, 0),
      stripeApplicationFeesCents: stripeCharges.reduce(
        (s, c) => s + (c.application_fee_amount ?? 0),
        0,
      ),
      stripeTransfersCents: stripeTransfers.reduce((s, t) => s + t.amount, 0),
      stripePayoutsCents: stripePayouts.reduce((s, p) => s + p.amount, 0),
    };

    const lineItems = this.findLineDiscrepancies({
      payments,
      transactions,
      payouts,
      stripeCharges,
      stripeTransfers,
      stripePayouts,
    });

    const totals = this.findTotalDiscrepancies(summary);

    return {
      summary,
      discrepancies: {
        items: [...totals, ...lineItems],
        lineItemCount: lineItems.length,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  private findTotalDiscrepancies(summary: ReconciliationSummary): LineDiscrepancy[] {
    const items: LineDiscrepancy[] = [];
    const paymentDelta = summary.localPaymentsCents - summary.stripeChargesCents;
    if (paymentDelta !== 0) {
      items.push({
        code: 'payments_vs_charges_total',
        objectType: 'payment',
        message: 'Aggregate local payments do not match Stripe charges.',
        localCents: summary.localPaymentsCents,
        stripeCents: summary.stripeChargesCents,
        deltaCents: paymentDelta,
      });
    }
    const feeDelta =
      summary.localPlatformFeeCents - summary.stripeApplicationFeesCents;
    if (feeDelta !== 0) {
      items.push({
        code: 'platform_fees_total',
        objectType: 'platform_fee',
        message: 'Aggregate platform fees do not match Stripe application fees.',
        localCents: summary.localPlatformFeeCents,
        stripeCents: summary.stripeApplicationFeesCents,
        deltaCents: feeDelta,
      });
    }
    return items;
  }

  private findLineDiscrepancies(input: {
    payments: Array<{
      id: string;
      amountCents: number;
      stripeChargeId: string | null;
      stripePaymentIntentId: string | null;
    }>;
    transactions: Array<{
      id: string;
      creatorNetCents: number;
      platformFeeCents: number;
      stripeChargeId: string | null;
      stripePaymentIntentId: string | null;
    }>;
    payouts: Array<{
      id: string;
      amountCents: number;
      stripePayoutId: string;
    }>;
    stripeCharges: Array<{
      id: string;
      amount: number;
      application_fee_amount: number | null;
      payment_intent: string | { id: string } | null;
    }>;
    stripeTransfers: Array<{
      id: string;
      amount: number;
      source_transaction: string | { id: string } | null;
    }>;
    stripePayouts: Array<{ id: string; amount: number }>;
  }): LineDiscrepancy[] {
    const items: LineDiscrepancy[] = [];

    const chargeById = new Map(input.stripeCharges.map((c) => [c.id, c]));
    const matchedChargeIds = new Set<string>();

    for (const payment of input.payments) {
      const chargeId = payment.stripeChargeId;
      if (!chargeId) {
        items.push({
          code: 'payment_missing_charge_id',
          objectType: 'payment',
          localId: payment.id,
          message: 'Local payment has no stripeChargeId.',
          localCents: payment.amountCents,
        });
        continue;
      }

      const charge = chargeById.get(chargeId);
      if (!charge) {
        items.push({
          code: 'payment_charge_not_in_stripe',
          objectType: 'payment',
          localId: payment.id,
          stripeId: chargeId,
          message: 'Local payment references Stripe charge not found in period.',
          localCents: payment.amountCents,
        });
        continue;
      }

      matchedChargeIds.add(chargeId);
      if (payment.amountCents !== charge.amount) {
        items.push({
          code: 'payment_amount_mismatch',
          objectType: 'payment',
          localId: payment.id,
          stripeId: chargeId,
          message: 'Payment amount does not match Stripe charge.',
          localCents: payment.amountCents,
          stripeCents: charge.amount,
          deltaCents: payment.amountCents - charge.amount,
        });
      }
    }

    for (const charge of input.stripeCharges) {
      if (!matchedChargeIds.has(charge.id)) {
        items.push({
          code: 'orphan_stripe_charge',
          objectType: 'charge',
          stripeId: charge.id,
          message: 'Stripe charge has no matching local payment.',
          stripeCents: charge.amount,
        });
      }
    }

    for (const tx of input.transactions) {
      if (!tx.stripeChargeId) {
        items.push({
          code: 'transaction_missing_charge',
          objectType: 'creator_transaction',
          localId: tx.id,
          message: 'Creator transaction missing stripeChargeId.',
          localCents: tx.creatorNetCents,
        });
        continue;
      }
      const charge = chargeById.get(tx.stripeChargeId);
      if (charge && tx.platformFeeCents !== (charge.application_fee_amount ?? 0)) {
        items.push({
          code: 'transaction_fee_mismatch',
          objectType: 'creator_transaction',
          localId: tx.id,
          stripeId: tx.stripeChargeId,
          message: 'Platform fee on transaction does not match charge application fee.',
          localCents: tx.platformFeeCents,
          stripeCents: charge.application_fee_amount ?? 0,
          deltaCents: tx.platformFeeCents - (charge.application_fee_amount ?? 0),
        });
      }
    }

    const payoutByStripeId = new Map(
      input.payouts.map((p) => [p.stripePayoutId, p]),
    );
    for (const sp of input.stripePayouts) {
      const local = payoutByStripeId.get(sp.id);
      if (!local) {
        items.push({
          code: 'orphan_stripe_payout',
          objectType: 'payout',
          stripeId: sp.id,
          message: 'Stripe payout not recorded locally.',
          stripeCents: sp.amount,
        });
      } else if (local.amountCents !== sp.amount) {
        items.push({
          code: 'payout_amount_mismatch',
          objectType: 'payout',
          localId: local.id,
          stripeId: sp.id,
          message: 'Local payout amount does not match Stripe.',
          localCents: local.amountCents,
          stripeCents: sp.amount,
          deltaCents: local.amountCents - sp.amount,
        });
      }
    }

    return items;
  }

  private toDto(report: {
    id: string;
    status: ReconciliationReportStatus;
    periodStart: Date;
    periodEnd: Date;
    summary: unknown;
    discrepancies: unknown;
    stripeBalanceCents: number | null;
    localBalanceCents: number | null;
    errorMessage: string | null;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
  }): ReconciliationReportDto {
    return {
      id: report.id,
      status: report.status,
      periodStart: report.periodStart.toISOString(),
      periodEnd: report.periodEnd.toISOString(),
      summary: (report.summary as Record<string, unknown> | null) ?? null,
      discrepancies:
        (report.discrepancies as Record<string, unknown> | null) ?? null,
      stripeBalanceCents: report.stripeBalanceCents,
      localBalanceCents: report.localBalanceCents,
      errorMessage: report.errorMessage,
      startedAt: report.startedAt?.toISOString() ?? null,
      completedAt: report.completedAt?.toISOString() ?? null,
      createdAt: report.createdAt.toISOString(),
    };
  }
}
