import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AdminPermissionGuard } from '../admin-risk/guards/admin-permission.guard';
import { RequireAdminPermissions } from '../admin-risk/decorators/require-admin-permissions.decorator';
import { ADMIN_PERMISSIONS } from '../admin-risk/admin-permissions.constants';
import {
  CreatorRevenueQuery,
  PlatformRevenueQuery,
  RiskDashboardQuery,
  TransactionTimelineQuery,
} from './admin-queries.service';

@Controller('admin/queries')
@UseGuards(AdminPermissionGuard)
export class AdminQueriesController {
  constructor(
    private readonly platformRevenue: PlatformRevenueQuery,
    private readonly creatorRevenue: CreatorRevenueQuery,
    private readonly riskDashboard: RiskDashboardQuery,
    private readonly transactionTimeline: TransactionTimelineQuery,
  ) {}

  @Get('platform-revenue')
  @RequireAdminPermissions(ADMIN_PERMISSIONS.METRICS_READ)
  getPlatformRevenue(@Query('currency') currency?: string) {
    return this.platformRevenue.execute(currency);
  }

  @Get('creators/:creatorProfileId/revenue')
  @RequireAdminPermissions(ADMIN_PERMISSIONS.METRICS_READ)
  getCreatorRevenue(
    @Param('creatorProfileId') creatorProfileId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.creatorRevenue.execute(
      creatorProfileId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  @Get('risk-dashboard')
  @RequireAdminPermissions(ADMIN_PERMISSIONS.CREATORS_READ)
  getRiskDashboard(@Query('limit') limit?: string) {
    return this.riskDashboard.execute(limit ? Number(limit) : 20);
  }

  @Get('transaction-timeline')
  @RequireAdminPermissions(ADMIN_PERMISSIONS.TRANSACTIONS_READ)
  getTransactionTimeline(
    @Query('creatorProfileId') creatorProfileId?: string,
    @Query('courseId') courseId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.transactionTimeline.execute({
      creatorProfileId,
      courseId,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
