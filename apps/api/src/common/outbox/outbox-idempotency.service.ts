import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class OutboxIdempotencyService {
  constructor(private readonly prisma: PrismaService) {}

  async alreadyProcessed(
    outboxEventId: string,
    handlerKey: string,
  ): Promise<boolean> {
    const existing = await this.prisma.outboxHandlerReceipt.findUnique({
      where: {
        outboxEventId_handlerKey: { outboxEventId, handlerKey },
      },
    });
    return Boolean(existing);
  }

  async markProcessed(
    outboxEventId: string,
    handlerKey: string,
  ): Promise<void> {
    await this.prisma.outboxHandlerReceipt.create({
      data: { outboxEventId, handlerKey },
    });
  }
}
