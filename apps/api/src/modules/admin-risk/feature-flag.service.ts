import { Injectable, NotFoundException } from '@nestjs/common';
import { AdminAuditTargetType, Prisma } from '@smartklass/database';
import { PrismaService } from '../../common/database/prisma.service';
import { AdminAuditService, auditSnapshot } from './admin-audit.service';

@Injectable()
export class FeatureFlagService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  async listFlags() {
    return this.prisma.featureFlag.findMany({
      orderBy: { key: 'asc' },
    });
  }

  async getFlag(key: string) {
    const flag = await this.prisma.featureFlag.findUnique({ where: { key } });
    if (!flag) {
      throw new NotFoundException(`Feature flag ${key} not found.`);
    }
    return flag;
  }

  async upsertFlag(
    key: string,
    enabled: boolean,
    actorUserId: string,
    config?: Record<string, unknown> | null,
    ipAddress?: string | null,
  ) {
    const before = await this.prisma.featureFlag.findUnique({ where: { key } });
    const flag = await this.prisma.featureFlag.upsert({
      where: { key },
      create: {
        key,
        enabled,
        config: config as Prisma.InputJsonValue | undefined,
      },
      update: {
        enabled,
        ...(config !== undefined
          ? { config: config as Prisma.InputJsonValue }
          : {}),
      },
    });

    await this.audit.log({
      actorUserId,
      action: 'upsert_feature_flag',
      targetType: AdminAuditTargetType.FEATURE_FLAG,
      targetId: key,
      before: before
        ? { enabled: before.enabled, config: before.config }
        : null,
      after: { enabled: flag.enabled, config: flag.config },
      ipAddress,
    });

    return flag;
  }
}

@Injectable()
export class FraudRulesService {
  constructor(private readonly prisma: PrismaService) {}

  async listRules() {
    return this.prisma.fraudRule.findMany({ orderBy: { name: 'asc' } });
  }

  async seedDefaults() {
    const defaults = [
      {
        name: 'high_refund_rate',
        description: 'Flag creators when refund rate exceeds threshold.',
        config: { threshold: 0.05, action: 'manual_review' },
      },
      {
        name: 'high_dispute_rate',
        description: 'Flag creators when dispute rate exceeds threshold.',
        config: { threshold: 0.02, action: 'manual_review' },
      },
      {
        name: 'large_single_charge',
        description: 'Flag transactions above configured amount.',
        config: { amountCents: 50000, action: 'flag_transaction' },
      },
    ];

    for (const rule of defaults) {
      await this.prisma.fraudRule.upsert({
        where: { name: rule.name },
        create: rule,
        update: {},
      });
    }

    return this.listRules();
  }
}
