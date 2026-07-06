import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AdminAuditTargetType } from '@smartklass/database';
import { PrismaService } from '../../common/database/prisma.service';
import { StripeWebhookService } from '../billing/stripe-webhook.service';
import { AdminAuditService, auditSnapshot } from './admin-audit.service';

@Injectable()
export class WebhookReplayService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeWebhook: StripeWebhookService,
    private readonly audit: AdminAuditService,
  ) {}

  async listProcessedEvents(options?: {
    type?: string;
    replayRequested?: boolean;
    limit?: number;
  }) {
    return this.prisma.processedStripeEvent.findMany({
      where: {
        ...(options?.type ? { type: options.type } : {}),
        ...(options?.replayRequested
          ? { replayRequestedAt: { not: null } }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit ?? 100,
    });
  }

  async markForReplay(
    eventId: string,
    actorUserId: string,
    reason?: string | null,
    ipAddress?: string | null,
  ) {
    const existing = await this.prisma.processedStripeEvent.findUnique({
      where: { id: eventId },
    });

    if (!existing) {
      throw new NotFoundException('Processed Stripe event not found.');
    }

    const updated = await this.prisma.processedStripeEvent.update({
      where: { id: eventId },
      data: { replayRequestedAt: new Date() },
    });

    await this.audit.log({
      actorUserId,
      action: 'mark_stripe_event_replay',
      targetType: AdminAuditTargetType.STRIPE_EVENT,
      targetId: eventId,
      before: auditSnapshot({ replayRequestedAt: existing.replayRequestedAt }),
      after: auditSnapshot({ replayRequestedAt: updated.replayRequestedAt }),
      reason,
      ipAddress,
    });

    return updated;
  }

  async replayEvent(
    eventId: string,
    actorUserId: string,
    options?: {
      force?: boolean;
      reason?: string | null;
      ipAddress?: string | null;
    },
  ) {
    if (!this.stripeWebhook.isReplayEnabled()) {
      throw new BadRequestException('Stripe is not configured for replay.');
    }

    const result = await this.stripeWebhook.replayEvent(eventId, {
      force: options?.force ?? false,
    });

    await this.prisma.processedStripeEvent.update({
      where: { id: eventId },
      data: {
        lastReplayedAt: new Date(),
        replayCount: { increment: 1 },
        replayRequestedAt: null,
      },
    });

    await this.audit.log({
      actorUserId,
      action: 'replay_stripe_event',
      targetType: AdminAuditTargetType.STRIPE_EVENT,
      targetId: eventId,
      after: result,
      reason: options?.reason,
      ipAddress: options?.ipAddress,
    });

    return result;
  }
}
