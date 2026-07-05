import { cn } from '@/lib/utils';

export function LearnLoadingSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse', className)}>
      <div className="flex flex-col gap-8 lg:flex-row">
        <div className="min-w-0 flex-1 space-y-6">
          <div className="aspect-video rounded-2xl bg-border-subtle" />
          <div className="space-y-3">
            <div className="h-7 w-2/3 rounded-lg bg-border-subtle" />
            <div className="h-4 w-full rounded bg-border-subtle" />
            <div className="h-4 w-4/5 rounded bg-border-subtle" />
          </div>
          <div className="rounded-xl border border-border-subtle p-5">
            <div className="h-4 w-24 rounded bg-border-subtle" />
            <div className="mt-4 h-10 rounded-lg bg-border-subtle" />
          </div>
        </div>

        <aside className="w-full shrink-0 lg:w-96">
          <div className="rounded-2xl border border-border-subtle bg-surface p-5">
            <div className="h-5 w-40 rounded bg-border-subtle" />
            <div className="mt-4 h-2 w-full rounded-full bg-border-subtle" />
            <div className="mt-6 space-y-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-10 rounded-lg bg-border-subtle" />
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
