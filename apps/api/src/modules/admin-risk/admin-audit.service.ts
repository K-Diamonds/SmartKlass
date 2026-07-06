import { Injectable } from '@nestjs/common';
import { AdminAuditTargetType, Prisma } from '@smartklass/database';
import { PrismaService } from '../../common/database/prisma.service';

export type AuditLogInput = {
  actorUserId: string;
  action: string;
  targetType: AdminAuditTargetType;
  targetId: string;
  before?: Prisma.JsonValue | null;
  after?: Prisma.JsonValue | null;
  reason?: string | null;
  ipAddress?: string | null;
};

export function auditSnapshot(value: unknown): Prisma.JsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.JsonValue;
}

@Injectable()
export class AdminAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditLogInput) {
    return this.prisma.adminAuditLog.create({
      data: {
        actorUserId: input.actorUserId,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        before: input.before ?? undefined,
        after: input.after ?? undefined,
        reason: input.reason ?? undefined,
        ipAddress: input.ipAddress ?? undefined,
      },
    });
  }

  async listRecent(options?: {
    targetType?: AdminAuditTargetType;
    targetId?: string;
    action?: string;
    limit?: number;
  }) {
    return this.prisma.adminAuditLog.findMany({
      where: {
        ...(options?.targetType ? { targetType: options.targetType } : {}),
        ...(options?.targetId ? { targetId: options.targetId } : {}),
        ...(options?.action ? { action: options.action } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit ?? 100,
      include: {
        actor: {
          select: {
            id: true,
            email: true,
            profile: { select: { displayName: true } },
          },
        },
      },
    });
  }
}
