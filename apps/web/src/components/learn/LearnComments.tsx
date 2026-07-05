import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';

type LearnCommentsProps = {
  className?: string;
};

export function LearnComments({ className }: LearnCommentsProps) {
  return (
    <section className={cn('rounded-2xl border border-border-subtle bg-surface', className)}>
      <div className="border-b border-border-subtle px-5 py-4">
        <h2 className="text-sm font-semibold text-foreground">Discussion</h2>
      </div>
      <EmptyState
        className="border-0 bg-transparent py-12"
        icon="💬"
        title="Comments coming soon"
        description="Ask questions and connect with other learners — discussion threads will appear here."
      />
    </section>
  );
}
