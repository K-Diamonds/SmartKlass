import type { AdminAuditLog } from '@/lib/api/admin';
import { formatAdminDate } from './admin-utils';

type AuditTrailPanelProps = {
  logs: AdminAuditLog[];
  compact?: boolean;
};

export function AuditTrailPanel({ logs, compact }: AuditTrailPanelProps) {
  if (logs.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-white/40">No audit events yet.</p>
    );
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <article
          key={log.id}
          className="rounded-lg border border-white/8 bg-[#0e0e14] px-4 py-3"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-[#d4a853]">{log.action}</span>
            <span className="text-xs text-white/30">→</span>
            <span className="text-xs text-white/50">
              {log.targetType} / {log.targetId}
            </span>
            <span className="ml-auto text-xs text-white/35">
              {formatAdminDate(log.createdAt)}
            </span>
          </div>
          <p className="mt-2 text-sm text-white/70">
            <span className="text-white/45">Actor:</span>{' '}
            {log.actor.profile?.displayName ?? log.actor.email}
          </p>
          {log.reason && (
            <p className="mt-1 text-sm text-white/55">
              <span className="text-white/35">Reason:</span> {log.reason}
            </p>
          )}
          {!compact && (log.before || log.after) && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {log.before && (
                <pre className="overflow-x-auto rounded border border-white/6 bg-black/20 p-2 font-mono text-[10px] text-white/45">
                  {JSON.stringify(log.before, null, 2)}
                </pre>
              )}
              {log.after && (
                <pre className="overflow-x-auto rounded border border-emerald-500/15 bg-emerald-500/5 p-2 font-mono text-[10px] text-emerald-200/70">
                  {JSON.stringify(log.after, null, 2)}
                </pre>
              )}
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
