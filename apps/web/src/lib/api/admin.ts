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

export type PaginatedMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PaginatedResult<T> = {
  items: T[];
  meta: PaginatedMeta;
};

export type AdminListParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  creatorProfileId?: string;
  from?: string;
  to?: string;
};

export type RefundRequestStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'DENIED'
  | 'EXECUTING'
  | 'EXECUTED'
  | 'FAILED';

export type AdminRefundRequest = {
  id: string;
  paymentId: string;
  amountCents: number;
  currency: string;
  reason: string;
  status: RefundRequestStatus;
  denialReason: string | null;
  executionError: string | null;
  stripeRefundId: string | null;
  createdAt: string;
  approvedAt: string | null;
  deniedAt: string | null;
  executedAt: string | null;
  requester: { id: string; email: string };
  approver: { id: string; email: string } | null;
  denier: { id: string; email: string } | null;
  executor: { id: string; email: string } | null;
  payment: {
    id: string;
    amountCents: number;
    stripeChargeId: string | null;
    user: { email: string };
  };
  creatorTransaction: {
    id: string;
    creatorProfile: { id: string; displayName: string };
  } | null;
};

export type AdminTransactionDetail = AdminCreatorTransaction & {
  stripeChargeId: string | null;
  stripePaymentIntentId: string | null;
  stripeTransferId: string | null;
  availableAt: string | null;
  paidOutAt: string | null;
  payment: {
    id: string;
    status: string;
    amountCents: number;
    stripeChargeId: string | null;
    user: {
      id: string;
      email: string;
      profile: { displayName: string } | null;
    };
  } | null;
  refunds: Array<{
    id: string;
    amountCents: number;
    status: string;
    createdAt: string;
  }>;
  disputes: Array<{
    id: string;
    amountCents: number;
    status: string;
    createdAt: string;
  }>;
};

export type AdminPermissions = {
  permissions: string[];
  roles: string[];
};

function buildAdminQuery(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      search.set(key, String(value));
    }
  }
  const q = search.toString();
  return q ? `?${q}` : '';
}

export function getAdminPermissions() {
  return apiFetch<AdminPermissions>('/admin/me/permissions');
}

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

export function listCreators(params: AdminListParams = {}) {
  return apiFetch<PaginatedResult<AdminCreator>>(
    `/admin/creators${buildAdminQuery({ limit: 20, ...params })}`,
  );
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

export function listTransactions(params: AdminListParams = {}) {
  return apiFetch<PaginatedResult<AdminCreatorTransaction>>(
    `/admin/transactions${buildAdminQuery({ limit: 20, ...params })}`,
  );
}

export function getTransaction(id: string) {
  return apiFetch<AdminTransactionDetail>(`/admin/transactions/${id}`);
}

export function listRefunds(params: AdminListParams = {}) {
  return apiFetch<PaginatedResult<AdminRefund>>(
    `/admin/refunds${buildAdminQuery({ limit: 20, ...params })}`,
  );
}

export function listRefundRequests(
  params: AdminListParams & { paymentId?: string } = {},
) {
  return apiFetch<PaginatedResult<AdminRefundRequest>>(
    `/admin/refund-requests${buildAdminQuery({ limit: 20, ...params })}`,
  );
}

export function getRefundRequest(id: string) {
  return apiFetch<AdminRefundRequest>(`/admin/refund-requests/${id}`);
}

export function getRefundRequestAudit(id: string) {
  return apiFetch<AdminAuditLog[]>(`/admin/refund-requests/${id}/audit`);
}

export function requestRefund(input: {
  paymentId: string;
  amountCents: number;
  reason: string;
}) {
  return apiFetch<AdminRefundRequest>('/admin/refund-requests', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function approveRefundRequest(id: string, reason: string) {
  return apiFetch<AdminRefundRequest>(`/admin/refund-requests/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function denyRefundRequest(
  id: string,
  reason: string,
  denialReason: string,
) {
  return apiFetch<AdminRefundRequest>(`/admin/refund-requests/${id}/deny`, {
    method: 'POST',
    body: JSON.stringify({ reason, denialReason }),
  });
}

export function executeRefundRequest(id: string, reason: string) {
  return apiFetch<AdminRefundRequest>(`/admin/refund-requests/${id}/execute`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function listDisputes(params: AdminListParams = {}) {
  return apiFetch<PaginatedResult<AdminDispute>>(
    `/admin/disputes${buildAdminQuery({ limit: 20, ...params })}`,
  );
}

export function listPayouts(params: AdminListParams = {}) {
  return apiFetch<PaginatedResult<AdminPayout>>(
    `/admin/payouts${buildAdminQuery({ limit: 20, ...params })}`,
  );
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
    await getAdminPermissions();
    return true;
  } catch {
    return false;
  }
}
