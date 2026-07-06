import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from '../../common/auth';
import type { AuthenticatedUser } from '../../common/auth/interfaces/authenticated-user.interface';
import { AdminAuditService } from './admin-audit.service';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminImpersonationService } from './admin-impersonation.service';
import { CreatorRiskService } from './creator-risk.service';
import {
  AddInternalNoteDto,
  AdminAuditLogQueryDto,
  ApproveRefundDto,
  ExtendPayoutHoldDto,
  FlagTransactionDto,
  ImpersonateUserDto,
  MarkCreatorHighRiskDto,
  MarkCreatorTrustedDto,
  ReplayStripeEventDto,
  RevokeCourseAccessDto,
  RunReconciliationDto,
  SuspendCreatorDto,
  UpdateDisputeEvidenceDto,
  UpdateFeatureFlagDto,
} from './dto/admin-risk.dto';
import { FeatureFlagService, FraudRulesService } from './feature-flag.service';
import { AdminPermissionGuard } from './guards/admin-permission.guard';
import { AdminRateLimitGuard } from './guards/admin-rate-limit.guard';
import { RefundWorkflowService } from './refund-workflow.service';
import { AdminRbacService } from './admin-rbac.service';
import { ADMIN_PERMISSIONS } from './admin-permissions.constants';
import { RequireAdminPermissions } from './decorators/require-admin-permissions.decorator';
import {
  AdminListQueryDto,
  DenyRefundDto,
  RefundActionDto,
  RefundRequestQueryDto,
  RequestRefundDto,
} from './dto/admin-list.dto';
import { StripeReconciliationService } from './stripe-reconciliation.service';
import { WebhookReplayService } from './webhook-replay.service';

function actorId(user: AuthenticatedUser): string {
  return user.impersonatorId ?? user.id;
}

function clientIp(request: Request): string | undefined {
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0]?.trim();
  }
  return request.ip;
}

@Controller('admin')
@UseGuards(AdminPermissionGuard, AdminRateLimitGuard)
export class AdminRiskController {
  constructor(
    private readonly dashboard: AdminDashboardService,
    private readonly creatorRisk: CreatorRiskService,
    private readonly audit: AdminAuditService,
    private readonly reconciliation: StripeReconciliationService,
    private readonly webhookReplay: WebhookReplayService,
    private readonly featureFlags: FeatureFlagService,
    private readonly fraudRules: FraudRulesService,
    private readonly impersonation: AdminImpersonationService,
    private readonly refundWorkflow: RefundWorkflowService,
    private readonly rbac: AdminRbacService,
  ) {}

  @Get('me/permissions')
  async getMyPermissions(@CurrentUser() user: AuthenticatedUser) {
    const actor = actorId(user);
    const [permissions, roles] = await Promise.all([
      this.rbac.getUserPermissions(actor),
      this.rbac.getUserRoles(actor),
    ]);
    return {
      permissions,
      roles: roles.map((r) => r.role.key),
    };
  }

  @Get('dashboard/metrics')
  @RequireAdminPermissions(ADMIN_PERMISSIONS.METRICS_READ)
  getMetrics() {
    return this.dashboard.getMetrics();
  }

  @Get('dashboard/top-creators')
  @RequireAdminPermissions(ADMIN_PERMISSIONS.METRICS_READ)
  getTopCreators(@Query('limit') limit?: string) {
    return this.dashboard.getTopCreators(limit ? Number(limit) : 10);
  }

  @Get('dashboard/suspicious-creators')
  @RequireAdminPermissions(ADMIN_PERMISSIONS.METRICS_READ)
  getSuspiciousCreators(@Query('limit') limit?: string) {
    return this.dashboard.getSuspiciousCreators(limit ? Number(limit) : 20);
  }

  @Get('dashboard/recent-payments')
  @RequireAdminPermissions(ADMIN_PERMISSIONS.METRICS_READ)
  getRecentPayments(@Query('limit') limit?: string) {
    return this.dashboard.getRecentPayments(limit ? Number(limit) : 50);
  }

  @Get('refunds')
  @RequireAdminPermissions(ADMIN_PERMISSIONS.REFUNDS_READ)
  listRefunds(@Query() query: AdminListQueryDto) {
    return this.dashboard.listRefunds(query);
  }

  @Get('refund-requests')
  @RequireAdminPermissions(ADMIN_PERMISSIONS.REFUNDS_READ)
  listRefundRequests(@Query() query: RefundRequestQueryDto) {
    return this.refundWorkflow.list({
      page: query.page,
      limit: query.limit,
      status: query.status,
      paymentId: query.paymentId,
      creatorProfileId: query.creatorProfileId,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    });
  }

  @Get('refund-requests/:id')
  @RequireAdminPermissions(ADMIN_PERMISSIONS.REFUNDS_READ)
  getRefundRequest(@Param('id') id: string) {
    return this.refundWorkflow.getById(id);
  }

  @Get('refund-requests/:id/audit')
  @RequireAdminPermissions(ADMIN_PERMISSIONS.REFUNDS_READ)
  getRefundRequestAudit(@Param('id') id: string) {
    return this.refundWorkflow.getAuditTrail(id);
  }

  @Post('refund-requests')
  @RequireAdminPermissions(ADMIN_PERMISSIONS.REFUNDS_REQUEST)
  requestRefund(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RequestRefundDto,
    @Req() request: Request,
  ) {
    return this.refundWorkflow.requestRefund(dto, {
      actorUserId: actorId(user),
      reason: dto.reason,
      ipAddress: clientIp(request),
    });
  }

  @Post('refund-requests/:id/approve')
  @RequireAdminPermissions(ADMIN_PERMISSIONS.REFUNDS_APPROVE)
  approveRefundRequest(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RefundActionDto,
    @Req() request: Request,
  ) {
    return this.refundWorkflow.approve(id, {
      actorUserId: actorId(user),
      reason: dto.reason,
      ipAddress: clientIp(request),
    });
  }

  @Post('refund-requests/:id/deny')
  @RequireAdminPermissions(ADMIN_PERMISSIONS.REFUNDS_DENY)
  denyRefundRequest(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: DenyRefundDto,
    @Req() request: Request,
  ) {
    return this.refundWorkflow.deny(id, dto.denialReason, {
      actorUserId: actorId(user),
      reason: dto.reason,
      ipAddress: clientIp(request),
    });
  }

  @Post('refund-requests/:id/execute')
  @RequireAdminPermissions(ADMIN_PERMISSIONS.REFUNDS_EXECUTE)
  executeRefundRequest(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RefundActionDto,
    @Req() request: Request,
  ) {
    return this.refundWorkflow.execute(id, {
      actorUserId: actorId(user),
      reason: dto.reason,
      ipAddress: clientIp(request),
    });
  }

  @Get('disputes')
  @RequireAdminPermissions(ADMIN_PERMISSIONS.DISPUTES_READ)
  listDisputes(@Query() query: AdminListQueryDto) {
    return this.dashboard.listDisputes(query);
  }

  @Get('payouts')
  @RequireAdminPermissions(ADMIN_PERMISSIONS.PAYOUTS_READ)
  listPayouts(@Query() query: AdminListQueryDto) {
    return this.dashboard.listPayouts(query);
  }

  @Get('transactions')
  @RequireAdminPermissions(ADMIN_PERMISSIONS.TRANSACTIONS_READ)
  listTransactions(@Query() query: AdminListQueryDto) {
    return this.dashboard.listCreatorTransactions(query);
  }

  @Get('transactions/:id')
  @RequireAdminPermissions(ADMIN_PERMISSIONS.TRANSACTIONS_READ)
  getTransaction(@Param('id') id: string) {
    return this.dashboard.getCreatorTransactionById(id);
  }

  @Get('creators')
  @RequireAdminPermissions(ADMIN_PERMISSIONS.CREATORS_READ)
  listCreators(@Query() query: AdminListQueryDto) {
    return this.dashboard.listCreators(query);
  }

  @Get('creators/:creatorProfileId/risk')
  @RequireAdminPermissions(ADMIN_PERMISSIONS.CREATORS_READ)
  getCreatorRisk(@Param('creatorProfileId') creatorProfileId: string) {
    return this.creatorRisk.getRiskProfile(creatorProfileId);
  }

  @Get('creators/:creatorProfileId/risk-events')
  @RequireAdminPermissions(ADMIN_PERMISSIONS.CREATORS_READ)
  getCreatorRiskEvents(
    @Param('creatorProfileId') creatorProfileId: string,
    @Query('limit') limit?: string,
  ) {
    return this.creatorRisk.listRiskEvents(
      creatorProfileId,
      limit ? Number(limit) : 50,
    );
  }

  @Post('creators/:creatorProfileId/suspend')
  @RequireAdminPermissions(ADMIN_PERMISSIONS.CREATORS_WRITE)
  suspendCreator(
    @Param('creatorProfileId') creatorProfileId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SuspendCreatorDto,
    @Req() request: Request,
  ) {
    return this.creatorRisk.suspendCreator(creatorProfileId, {
      actorUserId: actorId(user),
      reason: dto.reason,
      ipAddress: clientIp(request),
    });
  }

  @Post('creators/:creatorProfileId/trust')
  @RequireAdminPermissions(ADMIN_PERMISSIONS.CREATORS_WRITE)
  markTrusted(
    @Param('creatorProfileId') creatorProfileId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: MarkCreatorTrustedDto,
    @Req() request: Request,
  ) {
    return this.creatorRisk.markTrusted(creatorProfileId, {
      actorUserId: actorId(user),
      reason: dto.reason,
      ipAddress: clientIp(request),
    }, dto.payoutDelayDays);
  }

  @Post('creators/:creatorProfileId/high-risk')
  @RequireAdminPermissions(ADMIN_PERMISSIONS.CREATORS_WRITE)
  markHighRisk(
    @Param('creatorProfileId') creatorProfileId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: MarkCreatorHighRiskDto,
    @Req() request: Request,
  ) {
    return this.creatorRisk.markHighRisk(creatorProfileId, {
      actorUserId: actorId(user),
      reason: dto.reason,
      ipAddress: clientIp(request),
    }, dto.payoutDelayDays);
  }

  @Post('creators/:creatorProfileId/extend-payout-hold')
  @RequireAdminPermissions(ADMIN_PERMISSIONS.CREATORS_WRITE)
  extendPayoutHold(
    @Param('creatorProfileId') creatorProfileId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ExtendPayoutHoldDto,
    @Req() request: Request,
  ) {
    return this.creatorRisk.extendPayoutHold(
      creatorProfileId,
      dto.additionalDays,
      {
        actorUserId: actorId(user),
        reason: dto.reason,
        ipAddress: clientIp(request),
      },
    );
  }

  @Post('creators/:creatorProfileId/notes')
  @RequireAdminPermissions(ADMIN_PERMISSIONS.CREATORS_WRITE)
  addInternalNote(
    @Param('creatorProfileId') creatorProfileId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddInternalNoteDto,
    @Req() request: Request,
  ) {
    return this.creatorRisk.addInternalNote(creatorProfileId, dto.note, {
      actorUserId: actorId(user),
      reason: dto.reason,
      ipAddress: clientIp(request),
    });
  }

  @Post('course-access/revoke')
  @RequireAdminPermissions(ADMIN_PERMISSIONS.CREATORS_WRITE)
  revokeCourseAccess(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RevokeCourseAccessDto,
    @Req() request: Request,
  ) {
    return this.creatorRisk.revokeCourseAccess(dto.userId, dto.courseId, {
      actorUserId: actorId(user),
      reason: dto.reason,
      ipAddress: clientIp(request),
    });
  }

  @Post('refunds/:refundId/approve')
  @RequireAdminPermissions(ADMIN_PERMISSIONS.REFUNDS_APPROVE)
  approveRefund(
    @Param('refundId') refundId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ApproveRefundDto,
    @Req() request: Request,
  ) {
    return this.creatorRisk.approveRefund(refundId, {
      actorUserId: actorId(user),
      reason: dto.reason,
      ipAddress: clientIp(request),
    });
  }

  @Post('transactions/:transactionId/flag')
  @RequireAdminPermissions(ADMIN_PERMISSIONS.TRANSACTIONS_WRITE)
  flagTransaction(
    @Param('transactionId') transactionId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: FlagTransactionDto,
    @Req() request: Request,
  ) {
    return this.creatorRisk.flagTransaction(transactionId, dto.flagReason, {
      actorUserId: actorId(user),
      reason: dto.reason,
      ipAddress: clientIp(request),
    });
  }

  @Patch('disputes/:disputeId/evidence')
  @RequireAdminPermissions(ADMIN_PERMISSIONS.DISPUTES_WRITE)
  updateDisputeEvidence(
    @Param('disputeId') disputeId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateDisputeEvidenceDto,
    @Req() request: Request,
  ) {
    return this.creatorRisk.updateDisputeEvidence(
      disputeId,
      {
        evidenceNotes: dto.evidenceNotes,
        markSubmitted: dto.markSubmitted,
      },
      {
        actorUserId: actorId(user),
        ipAddress: clientIp(request),
      },
    );
  }

  @Get('audit-logs')
  @RequireAdminPermissions(ADMIN_PERMISSIONS.AUDIT_READ)
  listAuditLogs(@Query() query: AdminAuditLogQueryDto) {
    return this.audit.listRecent({
      targetType: query.targetType,
      targetId: query.targetId,
      action: query.action,
    });
  }

  @Get('reconciliation/reports')
  @RequireAdminPermissions(ADMIN_PERMISSIONS.RECONCILIATION_READ)
  listReconciliationReports() {
    return this.reconciliation.listReports();
  }

  @Get('reconciliation/reports/:id')
  @RequireAdminPermissions(ADMIN_PERMISSIONS.RECONCILIATION_READ)
  getReconciliationReport(@Param('id') id: string) {
    return this.reconciliation.getReport(id);
  }

  @Post('reconciliation/run')
  @RequireAdminPermissions(ADMIN_PERMISSIONS.RECONCILIATION_RUN)
  runReconciliation(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RunReconciliationDto,
    @Req() request: Request,
  ) {
    return this.reconciliation.enqueueReport(
      new Date(dto.periodStart),
      new Date(dto.periodEnd),
      actorId(user),
      clientIp(request),
    );
  }

  @Get('webhooks/stripe/processed')
  @RequireAdminPermissions(ADMIN_PERMISSIONS.WEBHOOKS_READ)
  listProcessedStripeEvents(
    @Query('type') type?: string,
    @Query('replayRequested') replayRequested?: string,
    @Query('limit') limit?: string,
  ) {
    return this.webhookReplay.listProcessedEvents({
      type,
      replayRequested: replayRequested === 'true',
      limit: limit ? Number(limit) : 100,
    });
  }

  @Post('webhooks/stripe/:eventId/mark-replay')
  @RequireAdminPermissions(ADMIN_PERMISSIONS.WEBHOOKS_REPLAY)
  markStripeEventReplay(
    @Param('eventId') eventId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ReplayStripeEventDto,
    @Req() request: Request,
  ) {
    return this.webhookReplay.markForReplay(
      eventId,
      actorId(user),
      dto.reason,
      clientIp(request),
    );
  }

  @Post('webhooks/stripe/:eventId/replay')
  @RequireAdminPermissions(ADMIN_PERMISSIONS.WEBHOOKS_REPLAY)
  replayStripeEvent(
    @Param('eventId') eventId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ReplayStripeEventDto,
    @Req() request: Request,
  ) {
    return this.webhookReplay.replayEvent(eventId, actorId(user), {
      force: dto.force,
      reason: dto.reason,
      ipAddress: clientIp(request),
    });
  }

  @Get('feature-flags')
  @RequireAdminPermissions(ADMIN_PERMISSIONS.METRICS_READ)
  listFeatureFlags() {
    return this.featureFlags.listFlags();
  }

  @Patch('feature-flags/:key')
  @RequireAdminPermissions(ADMIN_PERMISSIONS.FLAGS_WRITE)
  updateFeatureFlag(
    @Param('key') key: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateFeatureFlagDto,
    @Req() request: Request,
  ) {
    return this.featureFlags.upsertFlag(
      key,
      dto.enabled,
      actorId(user),
      dto.config,
      clientIp(request),
    );
  }

  @Get('fraud-rules')
  @RequireAdminPermissions(ADMIN_PERMISSIONS.METRICS_READ)
  listFraudRules() {
    return this.fraudRules.listRules();
  }

  @Post('fraud-rules/seed')
  @RequireAdminPermissions(ADMIN_PERMISSIONS.FLAGS_WRITE)
  seedFraudRules() {
    return this.fraudRules.seedDefaults();
  }

  @Post('users/:userId/impersonate')
  @RequireAdminPermissions(ADMIN_PERMISSIONS.IMPERSONATE)
  impersonateUser(
    @Param('userId') userId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ImpersonateUserDto,
    @Req() request: Request,
  ) {
    return this.impersonation.impersonateUser(
      actorId(user),
      user.impersonatorEmail ?? user.email,
      userId,
      dto.reason,
      clientIp(request),
    );
  }
}
