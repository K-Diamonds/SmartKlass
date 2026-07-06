import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OutboxEventStatus } from '@smartklass/database';
import { PrismaService } from '../database/prisma.service';
import { DomainEventBusService } from '../domain-events/domain-event-bus.service';
import type { DomainEventType } from '../domain-events/domain-event.types';
import { MetricsService } from '../observability/metrics.service';
import { TracingService } from '../observability/tracing.service';

@Injectable()
export class OutboxProcessorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxProcessorService.name);
  private interval?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: DomainEventBusService,
    private readonly configService: ConfigService,
    private readonly metrics: MetricsService,
    private readonly tracing: TracingService,
  ) {}

  onModuleInit() {
    const enabled =
      this.configService.get<string>('worker.enabled') !== 'false';
    if (!enabled) {
      this.logger.log('Outbox processor disabled (WORKER_ENABLED=false)');
      return;
    }

    const pollMs =
      this.configService.get<number>('worker.outboxPollMs') ?? 5000;
    this.interval = setInterval(() => {
      void this.processBatch().catch((error) => {
        this.logger.error('Outbox batch failed', error);
        this.metrics.increment('outbox_batch_failures_total');
      });
    }, pollMs);
    this.logger.log(`Outbox processor started (poll ${pollMs}ms)`);
  }

  onModuleDestroy() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  async processBatch(limit = 25): Promise<number> {
    const startedAt = Date.now();
    const pending = await this.prisma.outboxEvent.findMany({
      where: { status: OutboxEventStatus.PENDING },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    let processed = 0;

    for (const row of pending) {
      const claimed = await this.prisma.outboxEvent.updateMany({
        where: { id: row.id, status: OutboxEventStatus.PENDING },
        data: { status: OutboxEventStatus.PROCESSING },
      });

      if (claimed.count === 0) {
        continue;
      }

      try {
        await this.tracing.withSpan(
          'outbox.process',
          async () => {
            await this.eventBus.publish({
              id: row.id,
              eventType: row.eventType as DomainEventType,
              aggregateType: row.aggregateType,
              aggregateId: row.aggregateId,
              payload: row.payload as Record<string, unknown>,
              correlationId: row.correlationId ?? undefined,
            });
          },
          { eventType: row.eventType },
        );

        await this.prisma.outboxEvent.update({
          where: { id: row.id },
          data: {
            status: OutboxEventStatus.COMPLETED,
            processedAt: new Date(),
          },
        });
        processed += 1;
        this.metrics.increment('outbox_events_processed_total', {
          eventType: row.eventType,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown outbox error';
        const retryCount = row.retryCount + 1;
        const deadLetter = retryCount >= row.maxRetries;

        await this.prisma.outboxEvent.update({
          where: { id: row.id },
          data: {
            status: deadLetter
              ? OutboxEventStatus.DEAD_LETTER
              : OutboxEventStatus.PENDING,
            retryCount,
            lastError: message,
          },
        });

        this.metrics.increment('outbox_failures_total', {
          eventType: row.eventType,
          deadLetter: String(deadLetter),
        });

        this.logger.warn(
          `Outbox event ${row.id} (${row.eventType}) failed: ${message}`,
        );
      }
    }

    this.metrics.observe('outbox_batch_duration_ms', Date.now() - startedAt);
    return processed;
  }
}
