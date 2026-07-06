import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OutboxEventStatus } from '@smartklass/database';
import { PrismaService } from '../database/prisma.service';
import { DomainEventBusService } from '../domain-events/domain-event-bus.service';
import type { DomainEventType } from '../domain-events/domain-event.types';

@Injectable()
export class OutboxProcessorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxProcessorService.name);
  private interval?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: DomainEventBusService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    const enabled =
      this.configService.get<string>('worker.enabled') !== 'false';
    if (!enabled) {
      this.logger.log('Outbox processor disabled (WORKER_ENABLED=false)');
      return;
    }

    const pollMs = this.configService.get<number>('worker.outboxPollMs') ?? 5000;
    this.interval = setInterval(() => {
      void this.processBatch().catch((error) => {
        this.logger.error('Outbox batch failed', error);
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
        await this.eventBus.publish({
          id: row.id,
          eventType: row.eventType as DomainEventType,
          aggregateType: row.aggregateType,
          aggregateId: row.aggregateId,
          payload: row.payload as Record<string, unknown>,
          correlationId: row.correlationId ?? undefined,
        });

        await this.prisma.outboxEvent.update({
          where: { id: row.id },
          data: {
            status: OutboxEventStatus.COMPLETED,
            processedAt: new Date(),
          },
        });
        processed += 1;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown outbox error';
        const retryCount = row.retryCount + 1;
        const failed = retryCount >= row.maxRetries;

        await this.prisma.outboxEvent.update({
          where: { id: row.id },
          data: {
            status: failed
              ? OutboxEventStatus.FAILED
              : OutboxEventStatus.PENDING,
            retryCount,
            lastError: message,
          },
        });

        this.logger.warn(
          `Outbox event ${row.id} (${row.eventType}) failed: ${message}`,
        );
      }
    }

    return processed;
  }
}
