import { cn } from '@/lib/utils';

type StudioPageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
};

export function StudioPageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: StudioPageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div>
        {eyebrow && (
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

type StudioStatCardProps = {
  label: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
};

export function StudioStatCard({
  label,
  value,
  change,
  trend = 'neutral',
  className,
}: StudioStatCardProps) {
  const trendColor =
    trend === 'up'
      ? 'text-emerald-600'
      : trend === 'down'
        ? 'text-danger'
        : 'text-muted-foreground';

  return (
    <div
      className={cn(
        'rounded-2xl border border-border-subtle bg-surface p-5 shadow-soft',
        className,
      )}
    >
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      {change && <p className={cn('mt-1 text-xs font-medium', trendColor)}>{change}</p>}
    </div>
  );
}
