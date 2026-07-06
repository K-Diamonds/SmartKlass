'use client';

import { useEffect, useState } from 'react';
import { AuditTrailPanel } from '@/components/admin/AuditTrailPanel';
import { AdminPageHeader, AdminPanel } from '@/components/admin/AdminPageHeader';
import { listAuditLogs, type AdminAuditLog } from '@/lib/api/admin';
import { LoadingState } from '@/components/ui/LoadingState';

export function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void listAuditLogs()
      .then(setLogs)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState variant="page" label="Loading audit logs…" />;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Compliance"
        title="Audit logs"
        description="Immutable record of every staff action — actor, reason, before/after state, IP."
      />

      <AdminPanel>
        <AuditTrailPanel logs={logs} />
      </AdminPanel>
    </div>
  );
}
