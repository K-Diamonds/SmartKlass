import { apiFetch } from './client';

export type AdminMetrics = {
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

export type CreatorTrustLevel =
  | 'NEW'
  | 'STANDARD'
  | 'TRUSTED'
  | 'HIGH_RISK'
  | 'SUSPENDED';

export type TopCreator = {
  creatorProfileId: string;
  displayName: string;
  slug: string | null;
  grossSalesCents: number;
  creatorNetCents: number;
  transactionCount: number;
  trustLevel: CreatorTrustLevel | string;
};

export type SuspiciousCreator = {
  creatorProfileId: string;
  displayName: string;
  slug: string;
  isActive: boolean;
  trustLevel: CreatorTrustLevel;
  payoutDelayDays: number;
  disputeRate: number;
  refundRate: number;
  manualReviewRequired: boolean;
  lifetimeSalesCents: number;
};

export type CreatorRiskProfile = {
  id: string;
  creatorProfileId: string;
  trustLevel: CreatorTrustLevel;
  payoutDelayDays: number;
  manualReviewRequired: boolean;
  disputeRate: number;
  refundRate: number;
  lifetimeSalesCents: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreatorRiskEvent = {
  id: string;
  creatorProfileId: string;
  eventType: string;
  severity: string;
  description: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type AdminPayment = {
  id: string;
  amountCents: number;
  currency: string;
  status: string;
  stripePaymentIntentId: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    profile: { displayName: string } | null;
  };
  creatorTransaction: {
    course: {
      id: string;
      title: string;
      creatorProfile: { id: string; displayName: string; slug: string };
    };
  } | null;
};

export type AdminCreatorTransaction = {
  id: string;
  status: string;
  type: string;
  grossAmountCents: number;
  platformFeeCents: number;
  creatorNetCents: number;
  currency: string;
  adminFlaggedAt: string | null;
  adminFlagReason: string | null;
  createdAt: string;
  creatorProfile: { id: string; displayName: string; slug: string };
  course: { id: string; title: string };
  payment: { id: string; status: string } | null;
};

export type AdminRefund = {
  id: string;
  amountCents: number;
  currency: string;
  status: string;
  reason: string | null;
  adminApprovedAt: string | null;
  adminApprovedByUserId: string | null;
  createdAt: string;
  creatorTransaction: {
    id: string;
    creatorProfile: { id: string; displayName: string; slug: string };
    course: { id: string; title: string };
  } | null;
  payment: { id: string; user: { email: string } } | null;
};

export type AdminDispute = {
  id: string;
  amountCents: number;
  currency: string;
  status: string;
  reason: string | null;
  evidenceNotes: string | null;
  evidenceSubmittedAt: string | null;
  assignedAdminUserId: string | null;
  createdAt: string;
  closedAt: string | null;
  creatorTransaction: {
    id: string;
    creatorProfile: { id: string; displayName: string; slug: string };
    course: { id: string; title: string };
  } | null;
};

export type AdminPayout = {
  id: string;
  amountCents: number;
  currency: string;
  status: string;
  stripePayoutId: string;
  failureReason: string | null;
  scheduledFor: string | null;
  paidAt: string | null;
  createdAt: string;
  creatorProfile: { id: string; displayName: string; slug: string };
};

export type ReconciliationReport = {
  id: string;
  status: string;
  periodStart: string;
  periodEnd: string;
  summary: Record<string, unknown> | null;
  discrepancies: { items?: Array<{ code: string; message: string; deltaCents?: number }> } | null;
  stripeBalanceCents: number | null;
  localBalanceCents: number | null;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
};

export type ProcessedStripeEvent = {
  id: string;
  type: string;
  replayRequestedAt: string | null;
  lastReplayedAt: string | null;
  replayCount: number;
  createdAt: string;
};

export type FeatureFlag = {
  id: string;
  key: string;
  enabled: boolean;
  description: string | null;
  config: Record<string, unknown> | null;
};

export type FraudRule = {
  id: string;
  name: string;
  enabled: boolean;
  description: string | null;
  config: Record<string, unknown>;
};

export type AdminAuditLog = {
  id: string;
  actorUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  reason: string | null;
  ipAddress: string | null;
  createdAt: string;
  actor: {
    id: string;
    email: string;
    profile: { displayName: string } | null;
  };
};

export type AdminCreator = {
  id: string;
  displayName: string;
  slug: string;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  riskProfile: CreatorRiskProfile | null;
};

export function getAdminMetrics() {
  return apiFetch<AdminMetrics>('/admin/dashboard/metrics');
}

export function getTopCreators(limit = 10) {
  return apiFetch<TopCreator[]>(`/admin/dashboard/top-creators?limit=${limit}`);
}

export function getSuspiciousCreators(limit = 20) {
  return apiFetch<SuspiciousCreator[]>(
    `/admin/dashboard/suspicious-creators?limit=${limit}`,
  );
}

export function listCreators(limit = 50) {
  return apiFetch<AdminCreator[]>(`/admin/creators?limit=${limit}`);
}

export function getCreatorRisk(creatorProfileId: string) {
  return apiFetch<CreatorRiskProfile>(`/admin/creators/${creatorProfileId}/risk`);
}

export function getCreatorRiskEvents(creatorProfileId: string, limit = 50) {
  return apiFetch<CreatorRiskEvent[]>(
    `/admin/creators/${creatorProfileId}/risk-events?limit=${limit}`,
  );
}

export function getRecentPayments(limit = 50) {
  return apiFetch<AdminPayment[]>(`/admin/dashboard/recent-payments?limit=${limit}`);
}

export function listTransactions(limit = 50) {
  return apiFetch<AdminCreatorTransaction[]>(`/admin/transactions?limit=${limit}`);
}

export function listRefunds(limit = 50) {
  return apiFetch<AdminRefund[]>(`/admin/refunds?limit=${limit}`);
}

export function listDisputes(limit = 50) {
  return apiFetch<AdminDispute[]>(`/admin/disputes?limit=${limit}`);
}

export function listPayouts(limit = 50, status?: string) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (status) params.set('status', status);
  return apiFetch<AdminPayout[]>(`/admin/payouts?${params}`);
}

export function listReconciliationReports() {
  return apiFetch<ReconciliationReport[]>('/admin/reconciliation/reports');
}

export function runReconciliation(periodStart: string, periodEnd: string) {
  return apiFetch<ReconciliationReport>('/admin/reconciliation/run', {
    method: 'POST',
    body: JSON.stringify({ periodStart, periodEnd }),
  });
}

export function listProcessedStripeEvents(limit = 100) {
  return apiFetch<ProcessedStripeEvent[]>(
    `/admin/webhooks/stripe/processed?limit=${limit}`,
  );
}

export function markStripeEventReplay(eventId: string, reason: string) {
  return apiFetch(`/admin/webhooks/stripe/${eventId}/mark-replay`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function replayStripeEvent(eventId: string, reason: string, force = false) {
  return apiFetch(`/admin/webhooks/stripe/${eventId}/replay`, {
    method: 'POST',
    body: JSON.stringify({ reason, force }),
  });
}

export function listFeatureFlags() {
  return apiFetch<FeatureFlag[]>('/admin/feature-flags');
}

export function updateFeatureFlag(
  key: string,
  enabled: boolean,
  config?: Record<string, unknown>,
) {
  return apiFetch<FeatureFlag>(`/admin/feature-flags/${key}`, {
    method: 'PATCH',
    body: JSON.stringify({ enabled, config }),
  });
}

export function listFraudRules() {
  return apiFetch<FraudRule[]>('/admin/fraud-rules');
}

export function seedFraudRules() {
  return apiFetch<FraudRule[]>('/admin/fraud-rules/seed', { method: 'POST' });
}

export function listAuditLogs(params?: {
  targetType?: string;
  targetId?: string;
  action?: string;
}) {
  const search = new URLSearchParams();
  if (params?.targetType) search.set('targetType', params.targetType);
  if (params?.targetId) search.set('targetId', params.targetId);
  if (params?.action) search.set('action', params.action);
  const q = search.toString();
  return apiFetch<AdminAuditLog[]>(`/admin/audit-logs${q ? `?${q}` : ''}`);
}

type ReasonBody = { reason: string };

export function suspendCreator(creatorProfileId: string, reason: string) {
  return apiFetch<CreatorRiskProfile>(
    `/admin/creators/${creatorProfileId}/suspend`,
    { method: 'POST', body: JSON.stringify({ reason } satisfies ReasonBody) },
  );
}

export function markCreatorTrusted(
  creatorProfileId: string,
  reason: string,
  payoutDelayDays?: number,
) {
  return apiFetch<CreatorRiskProfile>(
    `/admin/creators/${creatorProfileId}/trust`,
    {
      method: 'POST',
      body: JSON.stringify({ reason, payoutDelayDays }),
    },
  );
}

export function markCreatorHighRisk(
  creatorProfileId: string,
  reason: string,
  payoutDelayDays?: number,
) {
  return apiFetch<CreatorRiskProfile>(
    `/admin/creators/${creatorProfileId}/high-risk`,
    {
      method: 'POST',
      body: JSON.stringify({ reason, payoutDelayDays }),
    },
  );
}

export function extendPayoutHold(
  creatorProfileId: string,
  additionalDays: number,
  reason: string,
) {
  return apiFetch<CreatorRiskProfile>(
    `/admin/creators/${creatorProfileId}/extend-payout-hold`,
    {
      method: 'POST',
      body: JSON.stringify({ additionalDays, reason }),
    },
  );
}

export function addCreatorNote(
  creatorProfileId: string,
  note: string,
  reason: string,
) {
  return apiFetch<CreatorRiskProfile>(
    `/admin/creators/${creatorProfileId}/notes`,
    { method: 'POST', body: JSON.stringify({ note, reason }) },
  );
}

export function approveRefund(refundId: string, reason: string) {
  return apiFetch(`/admin/refunds/${refundId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function flagTransaction(transactionId: string, flagReason: string, reason: string) {
  return apiFetch(`/admin/transactions/${transactionId}/flag`, {
    method: 'POST',
    body: JSON.stringify({ flagReason, reason }),
  });
}

export function updateDisputeEvidence(
  disputeId: string,
  input: { evidenceNotes?: string; markSubmitted?: boolean; reason: string },
) {
  return apiFetch(`/admin/disputes/${disputeId}/evidence`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function verifyAdminAccess(): Promise<boolean> {
  try {
    await getAdminMetrics();
    return true;
  } catch {
    return false;
  }
}
