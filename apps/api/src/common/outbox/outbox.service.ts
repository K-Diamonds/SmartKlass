import { Injectable } from '@nestjs/common';
import { OutboxEventStatus, Prisma } from '@smartklass/database';
import { PrismaService } from '../database/prisma.service';
import type { DomainEvent } from '../domain-events/domain-event.types';

type TransactionClient = Prisma.TransactionClient;

@Injectable()
export class OutboxService {
  constructor(private readonly prisma: PrismaService) {}

  async append(
    tx: TransactionClient,
    event: DomainEvent,
  ): Promise<void> {
    await tx.outboxEvent.create({
      data: {
        eventType: event.eventType,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        payload: event.payload as Prisma.InputJsonValue,
        correlationId: event.correlationId,
        status: OutboxEventStatus.PENDING,
      },
    });
  }

  async appendMany(
    tx: TransactionClient,
    events: DomainEvent[],
  ): Promise<void> {
    for (const event of events) {
      await this.append(tx, event);
    }
  }

  async getPendingCount(): Promise<number> {
    return this.prisma.outboxEvent.count({
      where: { status: OutboxEventStatus.PENDING },
    });
  }

  async getFailedCount(): Promise<number> {
    return this.prisma.outboxEvent.count({
      where: {
        status: { in: [OutboxEventStatus.FAILED, OutboxEventStatus.DEAD_LETTER] },
      },
    });
  }

  async getDeadLetterCount(): Promise<number> {
    return this.prisma.outboxEvent.count({
      where: { status: OutboxEventStatus.DEAD_LETTER },
    });
  }
}
