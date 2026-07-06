'use client';

import { useState, type ReactNode } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { BeforeAfterDiff } from './BeforeAfterDiff';

type AdminActionModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  riskImpact?: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  requireReason?: boolean;
  extraFields?: ReactNode;
  loading?: boolean;
  destructive?: boolean;
  onConfirm: (reason: string) => void | Promise<void>;
};

export function AdminActionModal({
  open,
  onClose,
  title,
  description,
  confirmLabel = 'Confirm action',
  riskImpact,
  before,
  after,
  requireReason = true,
  extraFields,
  loading = false,
  destructive = false,
  onConfirm,
}: AdminActionModalProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    if (loading) return;
    setReason('');
    setError(null);
    onClose();
  };

  const handleConfirm = async () => {
    const trimmed = reason.trim();
    if (requireReason && trimmed.length < 8) {
      setError('Provide a reason (at least 8 characters) for the audit log.');
      return;
    }
    setError(null);
    await onConfirm(trimmed);
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={title}
      description={description}
      className="max-w-3xl border-white/10 bg-[#16161f] text-white"
      footer={
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-white/40">Logged to audit trail with IP + actor.</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/70 hover:bg-white/5 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={loading}
              className={
                destructive
                  ? 'inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50'
                  : 'inline-flex items-center gap-2 rounded-lg bg-[#d4a853] px-4 py-2 text-sm font-medium text-[#0c0c0a] hover:opacity-90 disabled:opacity-50'
              }
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {confirmLabel}
            </button>
          </div>
        </div>
      }
    >
        <div className="space-y-5">
        <div className="rounded-lg border border-white/8 bg-white/[0.02] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white/40">
            Audit & compliance
          </p>
          <p className="mt-1 text-xs text-white/50">
            This action is recorded with actor ID, IP address, timestamp, and the reason below.
          </p>
        </div>

        {riskImpact && (
          <div className="flex gap-3 rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-3">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-400" />
            <div>
              <p className="text-sm font-medium text-amber-200">Risk impact</p>
              <p className="mt-1 text-sm text-amber-100/80">{riskImpact}</p>
            </div>
          </div>
        )}

        {(before || after) && <BeforeAfterDiff before={before} after={after} />}

        {extraFields}

        {requireReason && (
          <div>
            <label
              htmlFor="admin-action-reason"
              className="text-xs font-semibold uppercase tracking-wide text-white/45"
            >
              Reason (required)
            </label>
            <textarea
              id="admin-action-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Document why this action is taken — visible in audit logs."
              className="mt-2 w-full rounded-lg border border-white/10 bg-[#0e0e14] px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-[#d4a853]/50 focus:outline-none focus:ring-2 focus:ring-[#d4a853]/20"
            />
            {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
          </div>
        )}
      </div>
    </Modal>
  );
}
