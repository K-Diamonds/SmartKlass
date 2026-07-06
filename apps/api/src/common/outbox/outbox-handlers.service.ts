import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { NotificationType, Prisma } from '@smartklass/database';
import { AnalyticsService } from '../analytics/analytics.service';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../database/prisma.service';
import { MetricsService } from '../observability/metrics.service';
import { DOMAIN_EVENTS } from '../domain-events/domain-event.types';
import type { DomainEvent } from '../domain-events/domain-event.types';
import { DomainEventBusService } from '../domain-events/domain-event-bus.service';
import { OutboxIdempotencyService } from './outbox-idempotency.service';

type HandlerEvent = DomainEvent & { id: string };

function payloadText(value: unknown, fallback = ''): string {
  if (value == null) {
    return fallback;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return fallback;
}

@Injectable()
export class OutboxHandlersService implements OnModuleInit {
  private readonly logger = new Logger(OutboxHandlersService.name);

  constructor(
    private readonly eventBus: DomainEventBusService,
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly analytics: AnalyticsService,
    private readonly idempotency: OutboxIdempotencyService,
    private readonly metrics: MetricsService,
  ) {}

  onModuleInit() {
    this.eventBus.register(DOMAIN_EVENTS.PAYMENT_COMPLETED, (e) =>
      this.onPaymentCompleted(e),
    );
    this.eventBus.register(DOMAIN_EVENTS.COURSE_ACCESS_GRANTED, (e) =>
      this.onCourseAccessGranted(e),
    );
    this.eventBus.register(DOMAIN_EVENTS.CREATOR_TRANSACTION_CREATED, (e) =>
      this.onCreatorTransactionCreated(e),
    );
    this.eventBus.register(DOMAIN_EVENTS.EMAIL_QUEUED, (e) =>
      this.onEmailQueued(e),
    );
    this.eventBus.register(DOMAIN_EVENTS.NOTIFICATION_SENT, (e) =>
      this.onNotificationSent(e),
    );
    this.eventBus.register(DOMAIN_EVENTS.ANALYTICS_UPDATED, (e) =>
      this.onAnalyticsUpdated(e),
    );
    this.eventBus.register(DOMAIN_EVENTS.SUBSCRIPTION_EXPIRED, (e) =>
      this.onSubscriptionExpired(e),
    );
  }

  private async guard<T>(
    handlerKey: string,
    event: HandlerEvent,
    fn: () => Promise<T>,
  ): Promise<T | void> {
    if (await this.idempotency.alreadyProcessed(event.id, handlerKey)) {
      return;
    }
    try {
      const result = await fn();
      await this.idempotency.markProcessed(event.id, handlerKey);
      return result;
    } catch (error) {
      this.metrics.increment('outbox_handler_failures_total', {
        handler: handlerKey,
      });
      throw error;
    }
  }

  private async onPaymentCompleted(event: HandlerEvent) {
    await this.guard('payment_completed', event, () => {
      this.logger.log(
        `PaymentCompleted payment=${payloadText(event.payload.paymentId) || payloadText(event.payload.purchaseId)}`,
      );
      return Promise.resolve();
    });
  }

  private async onCourseAccessGranted(event: HandlerEvent) {
    await this.guard('course_access_granted_enqueue', event, async () => {
      const userId = payloadText(event.payload.userId);
      const courseId = payloadText(event.payload.courseId);
      if (!userId || !courseId) return;

      await this.prisma.outboxEvent.createMany({
        data: [
          {
            eventType: DOMAIN_EVENTS.EMAIL_QUEUED,
            aggregateType: 'user',
            aggregateId: userId,
            payload: { template: 'course_access_granted', courseId, userId },
            correlationId: event.correlationId,
          },
          {
            eventType: DOMAIN_EVENTS.NOTIFICATION_SENT,
            aggregateType: 'user',
            aggregateId: userId,
            payload: { courseId, userId, channel: 'in_app' },
            correlationId: event.correlationId,
          },
        ],
      });
    });
  }

  private async onCreatorTransactionCreated(event: HandlerEvent) {
    await this.guard('creator_transaction_created_enqueue', event, async () => {
      await this.prisma.outboxEvent.create({
        data: {
          eventType: DOMAIN_EVENTS.ANALYTICS_UPDATED,
          aggregateType: 'creator_transaction',
          aggregateId: payloadText(event.payload.transactionId, event.id),
          payload: event.payload as Prisma.InputJsonValue,
          correlationId: event.correlationId,
        },
      });
    });
  }

  private async onEmailQueued(event: HandlerEvent) {
    await this.guard('email_queued', event, async () => {
      const userId = payloadText(event.payload.userId, event.aggregateId);
      const template = payloadText(event.payload.template, 'generic');
      const courseId = payloadText(event.payload.courseId) || undefined;

      const to = await this.email.resolveUserEmail(userId);
      if (!to) {
        throw new Error(`No email for user ${userId}`);
      }

      const course = courseId
        ? await this.prisma.course.findUnique({
            where: { id: courseId },
            select: { title: true },
          })
        : null;

      await this.email.send({
        to,
        template,
        subject:
          template === 'course_access_granted'
            ? `Access granted: ${course?.title ?? 'your course'}`
            : 'SmartKlass notification',
        body:
          template === 'course_access_granted'
            ? `You now have access to ${course?.title ?? 'your course'}.`
            : 'You have a new update from SmartKlass.',
        metadata: { courseId, outboxEventId: event.id },
      });

      this.metrics.increment('emails_sent_total', { template });
    });
  }

  private async onNotificationSent(event: HandlerEvent) {
    await this.guard('notification_sent', event, async () => {
      const userId = payloadText(event.payload.userId, event.aggregateId);
      const courseId = payloadText(event.payload.courseId) || undefined;

      if (!userId) return;

      const course = courseId
        ? await this.prisma.course.findUnique({
            where: { id: courseId },
            select: { title: true },
          })
        : null;

      const existing = await this.prisma.notification.findFirst({
        where: {
          userId,
          type: NotificationType.PURCHASE_CONFIRMED,
          data: {
            path: '$.outboxEventId',
            equals: event.id,
          },
        },
      });

      if (existing) return;

      await this.prisma.notification.create({
        data: {
          userId,
          type: NotificationType.PURCHASE_CONFIRMED,
          title: 'Course access granted',
          body: course
            ? `You now have access to ${course.title}.`
            : 'Your course access is active.',
          data: { courseId, outboxEventId: event.id },
        },
      });

      this.metrics.increment('notifications_created_total');
    });
  }

  private async onAnalyticsUpdated(event: HandlerEvent) {
    await this.guard('analytics_updated', event, async () => {
      await this.analytics.recordEvent({
        creatorProfileId: event.payload.creatorProfileId as string | undefined,
        grossAmountCents: event.payload.grossAmountCents as number | undefined,
        currency: event.payload.currency as string | undefined,
        transactionId: event.payload.transactionId as string | undefined,
      });
      this.metrics.increment('analytics_updates_total');
    });
  }

  private async onSubscriptionExpired(event: HandlerEvent) {
    await this.guard('subscription_expired', event, () => {
      this.logger.log(
        `SubscriptionExpired id=${payloadText(event.payload.subscriptionId)}`,
      );
      return Promise.resolve();
    });
  }
}
