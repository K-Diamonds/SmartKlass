import { Injectable } from '@nestjs/common';
import { API_VERSION, APP_NAME } from '@smartklass/shared';
import { PrismaService } from '../../common/database/prisma.service';
import { OutboxService } from '../../common/outbox/outbox.service';
import { MetricsService } from '../../common/observability/metrics.service';
import { HealthCheckDto } from './dto/health-check.dto';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly metrics: MetricsService,
  ) {}

  async check(): Promise<HealthCheckDto> {
    const databaseStatus = await this.checkDatabase();
    const [outboxPending, outboxFailed] = await Promise.all([
      this.outbox.getPendingCount(),
      this.outbox.getFailedCount(),
    ]);

    return {
      status: databaseStatus === 'ok' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      service: APP_NAME,
      version: API_VERSION,
      checks: {
        database: databaseStatus,
        outboxPending,
        outboxFailed,
      },
    };
  }

  liveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  async readiness() {
    const databaseStatus = await this.checkDatabase();
    const outboxFailed = await this.outbox.getFailedCount();

    const ready = databaseStatus === 'ok' && outboxFailed < 100;

    return {
      status: ready ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: databaseStatus,
        outboxFailed,
      },
    };
  }

  getMetrics() {
    return this.metrics.snapshot();
  }

  private async checkDatabase(): Promise<'ok' | 'down'> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'ok';
    } catch {
      return 'down';
    }
  }
}
