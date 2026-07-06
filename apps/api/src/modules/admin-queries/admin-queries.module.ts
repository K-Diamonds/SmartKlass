import { Module } from '@nestjs/common';
import { AdminRiskModule } from '../admin-risk/admin-risk.module';
import { AdminQueriesController } from './admin-queries.controller';
import {
  CreatorRevenueQuery,
  PlatformRevenueQuery,
  RiskDashboardQuery,
  TransactionTimelineQuery,
} from './admin-queries.service';

@Module({
  imports: [AdminRiskModule],
  controllers: [AdminQueriesController],
  providers: [
    PlatformRevenueQuery,
    CreatorRevenueQuery,
    RiskDashboardQuery,
    TransactionTimelineQuery,
  ],
  exports: [
    PlatformRevenueQuery,
    CreatorRevenueQuery,
    RiskDashboardQuery,
    TransactionTimelineQuery,
  ],
})
export class AdminQueriesModule {}
