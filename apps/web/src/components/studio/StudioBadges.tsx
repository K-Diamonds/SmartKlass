import { cn } from '@/lib/utils';
import type { CourseStatus, LessonStatus } from '@/lib/studio/types';

export function normalizeCourseStatus(
  status: CourseStatus | 'PENDING_REVIEW',
): CourseStatus {
  return status === 'PENDING_REVIEW' ? 'DRAFT' : status;
}

const courseStatusStyles: Record<CourseStatus, string> = {
  DRAFT: 'bg-border-subtle text-muted-foreground',
  PUBLISHED: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  ARCHIVED: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
};

const lessonStatusStyles: Record<LessonStatus, string> = {
  DRAFT: 'bg-border-subtle text-muted-foreground',
  PUBLISHED: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
};

export function CourseStatusBadge({
  status,
  className,
}: {
  status: CourseStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
        courseStatusStyles[status],
        className,
      )}
    >
      {status.toLowerCase()}
    </span>
  );
}

export function LessonStatusBadge({
  status,
  className,
}: {
  status: LessonStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
        lessonStatusStyles[status],
        className,
      )}
    >
      {status.toLowerCase()}
    </span>
  );
}

export function PlanKindBadge({
  kind,
  className,
}: {
  kind: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full bg-accent-muted px-2.5 py-0.5 text-xs font-medium text-accent',
        className,
      )}
    >
      {kind}
    </span>
  );
}
