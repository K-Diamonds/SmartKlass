import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@smartklass/database';
import { PrismaService } from '../database/prisma.service';
import { DOMAIN_EVENTS } from '../domain-events/domain-event.types';
import { DomainEventBusService } from '../domain-events/domain-event-bus.service';

@Injectable()
export class OutboxHandlersService implements OnModuleInit {
  private readonly logger = new Logger(OutboxHandlersService.name);

  constructor(
    private readonly eventBus: DomainEventBusService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.eventBus.register(
      DOMAIN_EVENTS.PAYMENT_COMPLETED,
      (event) => this.onPaymentCompleted(event),
    );
    this.eventBus.register(
      DOMAIN_EVENTS.COURSE_ACCESS_GRANTED,
      (event) => this.onCourseAccessGranted(event),
    );
    this.eventBus.register(
      DOMAIN_EVENTS.CREATOR_TRANSACTION_CREATED,
      (event) => this.onCreatorTransactionCreated(event),
    );
    this.eventBus.register(
      DOMAIN_EVENTS.SUBSCRIPTION_EXPIRED,
      (event) => this.onSubscriptionExpired(event),
    );
  }

  private async onPaymentCompleted(
    event: { id: string; payload: Record<string, unknown>; correlationId?: string },
  ) {
    this.logger.log(
      `PaymentCompleted aggregate=${event.payload.paymentId ?? event.payload.purchaseId}`,
    );
  }

  private async onCourseAccessGranted(
    event: { id: string; payload: Record<string, unknown>; correlationId?: string },
  ) {
    const userId = String(event.payload.userId ?? '');
    const courseId = String(event.payload.courseId ?? '');
    if (!userId || !courseId) {
      return;
    }

    await this.prisma.outboxEvent.create({
      data: {
        eventType: DOMAIN_EVENTS.EMAIL_QUEUED,
        aggregateType: 'user',
        aggregateId: userId,
        payload: {
          template: 'course_access_granted',
          courseId,
        },
        correlationId: event.correlationId,
      },
    });

    await this.prisma.outboxEvent.create({
      data: {
        eventType: DOMAIN_EVENTS.NOTIFICATION_SENT,
        aggregateType: 'user',
        aggregateId: userId,
        payload: { courseId, channel: 'in_app' },
        correlationId: event.correlationId,
      },
    });
  }

  private async onCreatorTransactionCreated(
    event: { id: string; payload: Record<string, unknown>; correlationId?: string },
  ) {
    await this.prisma.outboxEvent.create({
      data: {
        eventType: DOMAIN_EVENTS.ANALYTICS_UPDATED,
        aggregateType: 'creator_transaction',
        aggregateId: String(event.payload.transactionId ?? event.id),
        payload: {
          creatorProfileId: event.payload.creatorProfileId,
          grossAmountCents: event.payload.grossAmountCents,
          currency: event.payload.currency,
        } as Prisma.InputJsonValue,
        correlationId: event.correlationId,
      },
    });
  }

  private async onSubscriptionExpired(
    event: { id: string; payload: Record<string, unknown>; correlationId?: string },
  ) {
    this.logger.log(`SubscriptionExpired subscription=${event.payload.subscriptionId}`);
  }
}
