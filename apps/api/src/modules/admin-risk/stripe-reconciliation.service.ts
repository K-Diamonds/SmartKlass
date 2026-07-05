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
      const summary = await this.buildSummary(report.periodStart, report.periodEnd);
      const discrepancies = this.findDiscrepancies(summary);

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
          summary,
          discrepancies,
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

  private async buildSummary(
    periodStart: Date,
    periodEnd: Date,
  ): Promise<ReconciliationSummary> {
    const [payments, transactions] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          status: PaymentStatus.SUCCEEDED,
          createdAt: { gte: periodStart, lte: periodEnd },
        },
        select: {
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
          creatorNetCents: true,
          platformFeeCents: true,
          stripeChargeId: true,
        },
      }),
    ]);

    let stripeChargesCount = 0;
    let stripeChargesCents = 0;
    let stripeApplicationFeesCents = 0;
    let stripeTransfersCents = 0;
    let stripePayoutsCents = 0;

    if (this.stripeClient.isConfigured()) {
      const stripe = this.stripeClient.getClient();
      const created = {
        gte: Math.floor(periodStart.getTime() / 1000),
        lte: Math.floor(periodEnd.getTime() / 1000),
      };

      const charges = await stripe.charges.list({ limit: 100, created });
      stripeChargesCount = charges.data.length;
      stripeChargesCents = charges.data.reduce(
        (sum, charge) => sum + charge.amount,
        0,
      );
      stripeApplicationFeesCents = charges.data.reduce(
        (sum, charge) => sum + (charge.application_fee_amount ?? 0),
        0,
      );

      const transfers = await stripe.transfers.list({ limit: 100, created });
      stripeTransfersCents = transfers.data.reduce(
        (sum, transfer) => sum + transfer.amount,
        0,
      );

      const payouts = await stripe.payouts.list({ limit: 100, created });
      stripePayoutsCents = payouts.data.reduce(
        (sum, payout) => sum + payout.amount,
        0,
      );
    }

    return {
      localPaymentsCount: payments.length,
      localPaymentsCents: payments.reduce(
        (sum, payment) => sum + payment.amountCents,
        0,
      ),
      localCreatorTransactionsCount: transactions.length,
      localCreatorNetCents: transactions.reduce(
        (sum, row) => sum + row.creatorNetCents,
        0,
      ),
      localPlatformFeeCents: transactions.reduce(
        (sum, row) => sum + row.platformFeeCents,
        0,
      ),
      stripeChargesCount,
      stripeChargesCents,
      stripeApplicationFeesCents,
      stripeTransfersCents,
      stripePayoutsCents,
    };
  }

  private findDiscrepancies(summary: ReconciliationSummary) {
    const items: Array<{ code: string; message: string; deltaCents?: number }> =
      [];

    const paymentDelta =
      summary.localPaymentsCents - summary.stripeChargesCents;
    if (paymentDelta !== 0) {
      items.push({
        code: 'payments_vs_charges',
        message: 'Local succeeded payments do not match Stripe charges total.',
        deltaCents: paymentDelta,
      });
    }

    const feeDelta =
      summary.localPlatformFeeCents - summary.stripeApplicationFeesCents;
    if (feeDelta !== 0) {
      items.push({
        code: 'platform_fees_vs_application_fees',
        message:
          'Ledger platform fees do not match Stripe application fees total.',
        deltaCents: feeDelta,
      });
    }

    if (
      summary.localCreatorTransactionsCount > 0 &&
      summary.localPaymentsCount === 0
    ) {
      items.push({
        code: 'orphan_creator_transactions',
        message: 'Creator transactions exist without matching local payments.',
      });
    }

    return { items, generatedAt: new Date().toISOString() };
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
