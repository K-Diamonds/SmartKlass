import Link from 'next/link';
import { cn } from '@/lib/utils';

type LearnErrorStateProps = {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
};

export function LearnErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  className,
}: LearnErrorStateProps) {
  return (
    <div
      className={cn(
        'flex min-h-[50vh] flex-col items-center justify-center rounded-2xl border border-border-subtle bg-surface px-8 py-16 text-center',
        className,
      )}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-danger/10 text-xl text-danger">
        !
      </span>
      <h2 className="mt-4 text-lg font-semibold text-foreground">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{message}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Try again
          </button>
        )}
        <Link
          href="/library"
          className="rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-border-subtle"
        >
          Back to library
        </Link>
      </div>
    </div>
  );
}
