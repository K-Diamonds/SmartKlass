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
import { AdminRateLimitGuard } from './guards/admin-rate-limit.guard';
import { StaffGuard } from './guards/staff.guard';
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
@UseGuards(StaffGuard, AdminRateLimitGuard)
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
  ) {}

  @Get('dashboard/metrics')
  getMetrics() {
    return this.dashboard.getMetrics();
  }

  @Get('dashboard/top-creators')
  getTopCreators(@Query('limit') limit?: string) {
    return this.dashboard.getTopCreators(limit ? Number(limit) : 10);
  }

  @Get('dashboard/suspicious-creators')
  getSuspiciousCreators(@Query('limit') limit?: string) {
    return this.dashboard.getSuspiciousCreators(limit ? Number(limit) : 20);
  }

  @Get('dashboard/recent-payments')
  getRecentPayments(@Query('limit') limit?: string) {
    return this.dashboard.getRecentPayments(limit ? Number(limit) : 50);
  }

  @Get('creators/:creatorProfileId/risk')
  getCreatorRisk(@Param('creatorProfileId') creatorProfileId: string) {
    return this.creatorRisk.getRiskProfile(creatorProfileId);
  }

  @Get('creators/:creatorProfileId/risk-events')
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
  addInternalNote(
    @Param('creatorProfileId') creatorProfileId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddInternalNoteDto,
    @Req() request: Request,
  ) {
    return this.creatorRisk.addInternalNote(creatorProfileId, dto.note, {
      actorUserId: actorId(user),
      ipAddress: clientIp(request),
    });
  }

  @Post('course-access/revoke')
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
  listAuditLogs(@Query() query: AdminAuditLogQueryDto) {
    return this.audit.listRecent({
      targetType: query.targetType,
      targetId: query.targetId,
      action: query.action,
    });
  }

  @Get('reconciliation/reports')
  listReconciliationReports() {
    return this.reconciliation.listReports();
  }

  @Get('reconciliation/reports/:id')
  getReconciliationReport(@Param('id') id: string) {
    return this.reconciliation.getReport(id);
  }

  @Post('reconciliation/run')
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
  listFeatureFlags() {
    return this.featureFlags.listFlags();
  }

  @Patch('feature-flags/:key')
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
  listFraudRules() {
    return this.fraudRules.listRules();
  }

  @Post('fraud-rules/seed')
  seedFraudRules() {
    return this.fraudRules.seedDefaults();
  }

  @Post('users/:userId/impersonate')
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
