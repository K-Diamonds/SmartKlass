import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { BillingModule } from '../billing/billing.module';
import { AdminAuditService } from './admin-audit.service';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminImpersonationService } from './admin-impersonation.service';
import { AdminRbacService } from './admin-rbac.service';
import { AdminRiskController } from './admin-risk.controller';
import { CreatorRiskService } from './creator-risk.service';
import { FeatureFlagService, FraudRulesService } from './feature-flag.service';
import { AdminPermissionGuard } from './guards/admin-permission.guard';
import { AdminRateLimitGuard } from './guards/admin-rate-limit.guard';
import { StaffGuard } from './guards/staff.guard';
import { RefundWorkflowService } from './refund-workflow.service';
import {
  RATE_LIMIT_STORE,
  createRateLimitStore,
} from './rate-limit/rate-limit.store';
import { StripeReconciliationService } from './stripe-reconciliation.service';
import { WebhookReplayService } from './webhook-replay.service';

@Module({
  imports: [AuthModule, BillingModule],
  controllers: [AdminRiskController],
  providers: [
    StaffGuard,
    AdminPermissionGuard,
    AdminRateLimitGuard,
    AdminRbacService,
    AdminAuditService,
    AdminDashboardService,
    CreatorRiskService,
    RefundWorkflowService,
    StripeReconciliationService,
    WebhookReplayService,
    FeatureFlagService,
    FraudRulesService,
    AdminImpersonationService,
    {
      provide: RATE_LIMIT_STORE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createRateLimitStore(config.get<string>('redisUrl') ?? undefined),
    },
  ],
  exports: [
    AdminAuditService,
    CreatorRiskService,
    AdminRbacService,
    StaffGuard,
  ],
})
export class AdminRiskModule {}
