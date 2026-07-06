import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import {
  AdminAuditTargetType,
  CreatorTrustLevel,
  ReconciliationReportStatus,
} from '@smartklass/database';

export class AdminReasonDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}

export class SuspendCreatorDto extends AdminReasonDto {}

export class MarkCreatorTrustedDto extends AdminReasonDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  payoutDelayDays?: number;
}

export class MarkCreatorHighRiskDto extends AdminReasonDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  payoutDelayDays?: number;
}

export class ExtendPayoutHoldDto extends AdminReasonDto {
  @IsInt()
  @Min(1)
  additionalDays!: number;
}

export class RevokeCourseAccessDto extends AdminReasonDto {
  @IsString()
  userId!: string;

  @IsString()
  courseId!: string;
}

export class ApproveRefundDto extends AdminReasonDto {}

export class FlagTransactionDto extends AdminReasonDto {
  @IsString()
  @MaxLength(500)
  flagReason!: string;
}

export class AddInternalNoteDto extends AdminReasonDto {
  @IsString()
  @MaxLength(5000)
  note!: string;
}

export class UpdateDisputeEvidenceDto {
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  evidenceNotes?: string;

  @IsOptional()
  @IsBoolean()
  markSubmitted?: boolean;
}

export class ImpersonateUserDto extends AdminReasonDto {}

export class UpdateFeatureFlagDto {
  @IsBoolean()
  enabled!: boolean;

  @IsOptional()
  config?: Record<string, unknown>;
}

export class RunReconciliationDto {
  @IsISO8601()
  periodStart!: string;

  @IsISO8601()
  periodEnd!: string;
}

export class ReplayStripeEventDto extends AdminReasonDto {
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}

export class AdminAuditLogQueryDto {
  @IsOptional()
  @IsString()
  targetType?: AdminAuditTargetType;

  @IsOptional()
  @IsString()
  targetId?: string;

  @IsOptional()
  @IsString()
  action?: string;
}

export type AdminDashboardMetricsDto = {
  platformRevenueCents: number;
  grossMerchandiseVolumeCents: number;
  creatorEarningsCents: number;
  pendingPayoutsCents: number;
  availablePayoutsCents: number;
  refundsCents: number;
  openDisputes: number;
  failedPayouts: number;
  currency: string;
};

export type CreatorRiskProfileDto = {
  id: string;
  creatorProfileId: string;
  trustLevel: CreatorTrustLevel;
  payoutDelayDays: number;
  manualReviewRequired: boolean;
  disputeRate: number;
  refundRate: number;
  lifetimeSalesCents: number;
  notes: string | null;
};

export type ReconciliationReportDto = {
  id: string;
  status: ReconciliationReportStatus;
  periodStart: string;
  periodEnd: string;
  summary: Record<string, unknown> | null;
  discrepancies: Record<string, unknown> | null;
  stripeBalanceCents: number | null;
  localBalanceCents: number | null;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
};
