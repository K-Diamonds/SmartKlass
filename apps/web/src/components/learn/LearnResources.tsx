import type { LessonWatchResource } from '@/lib/api/watch';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';

type LearnResourcesProps = {
  resources: LessonWatchResource[];
  className?: string;
};

export function LearnResources({ resources, className }: LearnResourcesProps) {
  if (resources.length === 0) {
    return (
      <EmptyState
        className={cn('py-10', className)}
        icon="📎"
        title="No resources"
        description="This lesson doesn't include downloadable links or files yet."
      />
    );
  }

  return (
    <section className={cn('rounded-2xl border border-border-subtle bg-surface', className)}>
      <div className="border-b border-border-subtle px-5 py-4">
        <h2 className="text-sm font-semibold text-foreground">Lesson resources</h2>
      </div>
      <ul className="divide-y divide-border-subtle">
        {resources.map((resource) => (
          <li key={resource.id}>
            <a
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-4 px-5 py-4 text-sm transition-colors hover:bg-border-subtle/50"
            >
              <div>
                <p className="font-medium text-foreground">{resource.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {resource.resourceType}
                </p>
              </div>
              <span className="shrink-0 text-accent">Open ↗</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
