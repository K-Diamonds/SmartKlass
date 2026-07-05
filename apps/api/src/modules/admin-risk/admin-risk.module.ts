import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BillingModule } from '../billing/billing.module';
import { AdminAuditService } from './admin-audit.service';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminImpersonationService } from './admin-impersonation.service';
import { AdminRiskController } from './admin-risk.controller';
import { CreatorRiskService } from './creator-risk.service';
import { FeatureFlagService, FraudRulesService } from './feature-flag.service';
import { AdminRateLimitGuard } from './guards/admin-rate-limit.guard';
import { StaffGuard } from './guards/staff.guard';
import { StripeReconciliationService } from './stripe-reconciliation.service';
import { WebhookReplayService } from './webhook-replay.service';

@Module({
  imports: [AuthModule, BillingModule],
  controllers: [AdminRiskController],
  providers: [
    StaffGuard,
    AdminRateLimitGuard,
    AdminAuditService,
    AdminDashboardService,
    CreatorRiskService,
    StripeReconciliationService,
    WebhookReplayService,
    FeatureFlagService,
    FraudRulesService,
    AdminImpersonationService,
  ],
  exports: [
    AdminAuditService,
    CreatorRiskService,
    StaffGuard,
  ],
})
export class AdminRiskModule {}
