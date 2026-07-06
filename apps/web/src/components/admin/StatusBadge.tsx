import { cn } from '@/lib/utils';
import { TRUST_LEVEL_META } from './admin-utils';

type StatusBadgeProps = {
  label: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
};

const toneClasses = {
  neutral: 'bg-white/8 text-white/70 ring-white/10',
  success: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/25',
  warning: 'bg-amber-500/15 text-amber-300 ring-amber-500/25',
  danger: 'bg-red-500/15 text-red-300 ring-red-500/25',
  info: 'bg-sky-500/15 text-sky-300 ring-sky-500/25',
};

export function StatusBadge({ label, tone = 'neutral', className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        toneClasses[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}

export function TrustLevelBadge({ level }: { level: string }) {
  const meta = TRUST_LEVEL_META[level] ?? { label: level, tone: 'neutral' as const };
  return <StatusBadge label={meta.label} tone={meta.tone} />;
}

export function payoutStatusTone(status: string): StatusBadgeProps['tone'] {
  switch (status) {
    case 'PAID':
    case 'SUCCEEDED':
    case 'COMPLETED':
      return 'success';
    case 'FAILED':
    case 'SUSPENDED':
      return 'danger';
    case 'PENDING':
    case 'PROCESSING':
    case 'RUNNING':
      return 'warning';
    default:
      return 'neutral';
  }
}
