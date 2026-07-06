import Link from 'next/link';
import { coursePublicUrl } from '@/lib/courses';
import { cn } from '@/lib/utils';

type LearnLockedStateProps = {
  courseSlug: string;
  courseId?: string;
  courseTitle?: string;
  lessonTitle?: string;
  message?: string;
  className?: string;
};

export function LearnLockedState({
  courseSlug,
  courseId,
  courseTitle,
  lessonTitle,
  message,
  className,
}: LearnLockedStateProps) {
  const defaultMessage =
    'Purchase or subscribe to unlock this lesson and the full course.';

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border-subtle bg-surface',
        className,
      )}
    >
      <div className="aspect-video bg-gradient-to-br from-border-subtle via-surface to-accent-muted/30">
        <div className="flex h-full flex-col items-center justify-center px-6 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface/80 text-2xl shadow-soft backdrop-blur">
            🔒
          </span>
          <h2 className="mt-4 text-xl font-semibold tracking-tight text-foreground">
            {lessonTitle ? `"${lessonTitle}" is locked` : 'Lesson locked'}
          </h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            {message ?? defaultMessage}
          </p>
          {courseTitle && (
            <p className="mt-1 text-xs text-muted-foreground">
              {courseTitle}
            </p>
          )}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={coursePublicUrl(courseId ?? courseSlug)}
              className="rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
            >
              View access plans
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-border px-6 py-2.5 text-sm font-medium text-foreground hover:bg-border-subtle"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
