import { cn } from '@/lib/utils';

type LoadingStateProps = {
  label?: string;
  className?: string;
  variant?: 'page' | 'inline' | 'card';
};

export function LoadingState({
  label = 'Loading…',
  className,
  variant = 'page',
}: LoadingStateProps) {
  if (variant === 'inline') {
    return (
      <div className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-accent" />
        {label}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div
        className={cn(
          'animate-pulse rounded-2xl border border-border-subtle bg-surface p-6',
          className,
        )}
      >
        <div className="h-40 rounded-xl bg-border-subtle" />
        <div className="mt-4 h-4 w-2/3 rounded bg-border-subtle" />
        <div className="mt-2 h-3 w-1/2 rounded bg-border-subtle" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex min-h-[40vh] flex-col items-center justify-center gap-4',
        className,
      )}
    >
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
