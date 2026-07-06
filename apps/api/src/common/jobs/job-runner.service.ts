import { Injectable, Logger } from '@nestjs/common';
import { JobRunStatus, Prisma, SubscriptionStatus } from '@smartklass/database';
import { PrismaService } from '../database/prisma.service';
import { MarketplaceAccountingService } from '../../modules/billing/marketplace-accounting.service';

export type JobHandler = () => Promise<Record<string, unknown> | void>;

@Injectable()
export class JobRunnerService {
  private readonly logger = new Logger(JobRunnerService.name);
  private readonly jobs = new Map<string, JobHandler>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly marketplaceAccounting: MarketplaceAccountingService,
  ) {
    this.registerBuiltInJobs();
  }

  register(name: string, handler: JobHandler): void {
    this.jobs.set(name, handler);
  }

  async run(jobName: string): Promise<void> {
    const handler = this.jobs.get(jobName);
    if (!handler) {
      throw new Error(`Unknown job: ${jobName}`);
    }

    const run = await this.prisma.jobRun.create({
      data: { jobName, status: JobRunStatus.RUNNING, startedAt: new Date() },
    });

    try {
      const metadata = await handler();
      await this.prisma.jobRun.update({
        where: { id: run.id },
        data: {
          status: JobRunStatus.COMPLETED,
          completedAt: new Date(),
          metadata: (metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        },
      });
      this.logger.log(`Job ${jobName} completed`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Job failed';
      await this.prisma.jobRun.update({
        where: { id: run.id },
        data: {
          status: JobRunStatus.FAILED,
          completedAt: new Date(),
          errorMessage: message,
        },
      });
      this.logger.error(`Job ${jobName} failed: ${message}`);
      throw error;
    }
  }

  listJobNames(): string[] {
    return [...this.jobs.keys()];
  }

  private registerBuiltInJobs(): void {
    this.register('expire_subscriptions', () => this.expireSubscriptions());
    this.register('promote_matured_transactions', () =>
      this.promoteMaturedTransactions(),
    );
    this.register('generate_analytics_snapshot', () =>
      this.generateAnalyticsSnapshot(),
    );
    this.register('cleanup_stale_job_runs', () => this.cleanupStaleJobRuns());
  }

  private async expireSubscriptions() {
    const now = new Date();
    const expired = await this.prisma.userSubscription.findMany({
      where: {
        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE] },
        currentPeriodEnd: { lt: now },
        deletedAt: null,
      },
      select: { id: true },
      take: 500,
    });

    if (expired.length === 0) {
      return { expiredCount: 0 };
    }

    await this.prisma.userSubscription.updateMany({
      where: { id: { in: expired.map((s) => s.id) } },
      data: { status: SubscriptionStatus.EXPIRED },
    });

    return { expiredCount: expired.length };
  }

  private async promoteMaturedTransactions() {
    const promoted = await this.marketplaceAccounting.promoteMaturedTransactions();
    return { promotedCount: promoted };
  }

  private async generateAnalyticsSnapshot() {
    const [payments, transactions, grants] = await Promise.all([
      this.prisma.payment.count({
        where: { status: 'SUCCEEDED' },
      }),
      this.prisma.creatorTransaction.count(),
      this.prisma.courseAccess.count({ where: { revokedAt: null } }),
    ]);

    return {
      snapshotAt: new Date().toISOString(),
      succeededPayments: payments,
      creatorTransactions: transactions,
      activeGrants: grants,
    };
  }

  private async cleanupStaleJobRuns() {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = await this.prisma.jobRun.deleteMany({
      where: { createdAt: { lt: cutoff }, status: JobRunStatus.COMPLETED },
    });
    return { deleted: result.count };
  }
}
