import { AdminRoleKey } from '@smartklass/database';

export const ADMIN_PERMISSIONS = {
  METRICS_READ: 'admin:metrics:read',
  CREATORS_READ: 'admin:creators:read',
  CREATORS_WRITE: 'admin:creators:write',
  TRANSACTIONS_READ: 'admin:transactions:read',
  TRANSACTIONS_WRITE: 'admin:transactions:write',
  REFUNDS_READ: 'admin:refunds:read',
  REFUNDS_REQUEST: 'admin:refunds:request',
  REFUNDS_APPROVE: 'admin:refunds:approve',
  REFUNDS_EXECUTE: 'admin:refunds:execute',
  REFUNDS_DENY: 'admin:refunds:deny',
  DISPUTES_READ: 'admin:disputes:read',
  DISPUTES_WRITE: 'admin:disputes:write',
  PAYOUTS_READ: 'admin:payouts:read',
  RECONCILIATION_READ: 'admin:reconciliation:read',
  RECONCILIATION_RUN: 'admin:reconciliation:run',
  WEBHOOKS_READ: 'admin:webhooks:read',
  WEBHOOKS_REPLAY: 'admin:webhooks:replay',
  FLAGS_WRITE: 'admin:flags:write',
  AUDIT_READ: 'admin:audit:read',
  IMPERSONATE: 'admin:impersonate',
} as const;

export type AdminPermissionKey =
  (typeof ADMIN_PERMISSIONS)[keyof typeof ADMIN_PERMISSIONS];

export const ALL_ADMIN_PERMISSIONS = Object.values(ADMIN_PERMISSIONS);

const READ_ONLY: AdminPermissionKey[] = [
  ADMIN_PERMISSIONS.METRICS_READ,
  ADMIN_PERMISSIONS.CREATORS_READ,
  ADMIN_PERMISSIONS.TRANSACTIONS_READ,
  ADMIN_PERMISSIONS.REFUNDS_READ,
  ADMIN_PERMISSIONS.DISPUTES_READ,
  ADMIN_PERMISSIONS.PAYOUTS_READ,
  ADMIN_PERMISSIONS.RECONCILIATION_READ,
  ADMIN_PERMISSIONS.WEBHOOKS_READ,
  ADMIN_PERMISSIONS.AUDIT_READ,
];

export const ROLE_PERMISSION_MAP: Record<AdminRoleKey, AdminPermissionKey[]> = {
  SUPER_ADMIN: ALL_ADMIN_PERMISSIONS,
  RISK_ANALYST: [
    ...READ_ONLY,
    ADMIN_PERMISSIONS.CREATORS_WRITE,
    ADMIN_PERMISSIONS.TRANSACTIONS_WRITE,
    ADMIN_PERMISSIONS.DISPUTES_WRITE,
    ADMIN_PERMISSIONS.REFUNDS_REQUEST,
  ],
  FINANCE: [
    ...READ_ONLY,
    ADMIN_PERMISSIONS.REFUNDS_REQUEST,
    ADMIN_PERMISSIONS.REFUNDS_APPROVE,
    ADMIN_PERMISSIONS.REFUNDS_EXECUTE,
    ADMIN_PERMISSIONS.REFUNDS_DENY,
    ADMIN_PERMISSIONS.RECONCILIATION_RUN,
  ],
  SUPPORT: [
    ...READ_ONLY,
    ADMIN_PERMISSIONS.REFUNDS_REQUEST,
    ADMIN_PERMISSIONS.DISPUTES_WRITE,
  ],
  READ_ONLY,
};

export const ROLE_LABELS: Record<AdminRoleKey, string> = {
  SUPER_ADMIN: 'Super Admin',
  RISK_ANALYST: 'Risk Analyst',
  FINANCE: 'Finance',
  SUPPORT: 'Support',
  READ_ONLY: 'Read Only',
};
