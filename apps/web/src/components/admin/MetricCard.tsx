import { cn } from '@/lib/utils';

type MetricCardProps = {
  label: string;
  value: string;
  hint?: string;
  trend?: string;
  tone?: 'default' | 'success' | 'warning' | 'danger';
  className?: string;
};

const toneBorder = {
  default: 'border-white/8',
  success: 'border-emerald-500/20',
  warning: 'border-amber-500/20',
  danger: 'border-red-500/20',
};

export function MetricCard({
  label,
  value,
  hint,
  trend,
  tone = 'default',
  className,
}: MetricCardProps) {
  const accent =
    tone === 'success'
      ? 'from-emerald-500/10'
      : tone === 'warning'
        ? 'from-amber-500/10'
        : tone === 'danger'
          ? 'from-red-500/10'
          : 'from-[#d4a853]/8';

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border bg-[#12121a] p-5 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]',
        toneBorder[tone],
        className,
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent',
          accent,
        )}
      />
      <div className="relative">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
          {label}
        </p>
        <p className="mt-2 font-display text-3xl font-semibold tracking-tight text-white">
          {value}
        </p>
        {hint && <p className="mt-1.5 text-xs text-white/45">{hint}</p>}
        {trend && (
          <p className="mt-2 text-xs font-medium text-emerald-400/90">{trend}</p>
        )}
      </div>
    </div>
  );
}
