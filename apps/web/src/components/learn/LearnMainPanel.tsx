import { YouTubeEmbed } from '@/components/player/YouTubeEmbed';
import type { LessonWatchData } from '@/lib/api/watch';
import { cn, formatDuration } from '@/lib/utils';
import { LearnLockedState } from './LearnLockedState';

type LearnMainPanelProps = {
  courseSlug: string;
  courseTitle?: string;
  lesson: LessonWatchData | null;
  locked: boolean;
  lockedLessonTitle?: string;
  className?: string;
};

export function LearnMainPanel({
  courseSlug,
  courseTitle,
  lesson,
  locked,
  lockedLessonTitle,
  className,
}: LearnMainPanelProps) {
  if (locked || !lesson) {
    return (
      <LearnLockedState
        courseSlug={courseSlug}
        courseTitle={courseTitle}
        lessonTitle={lockedLessonTitle}
        className={className}
      />
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {lesson.youtube ? (
        <YouTubeEmbed
          videoId={lesson.youtube.videoId}
          embedUrl={lesson.youtube.embedUrl}
          title={`${courseTitle ?? 'Course'} — ${lesson.title}`}
          className="rounded-2xl shadow-soft"
        />
      ) : (
        <div className="flex aspect-video items-center justify-center rounded-2xl border border-dashed border-border bg-surface text-sm text-muted-foreground">
          No YouTube video attached to this lesson yet.
        </div>
      )}

      <div>
        <div className="flex flex-wrap items-center gap-2">
          {lesson.durationSeconds ? (
            <span className="text-xs text-muted-foreground">
              {formatDuration(lesson.durationSeconds)}
            </span>
          ) : null}
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {lesson.title}
        </h1>
        {lesson.description ? (
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            {lesson.description}
          </p>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            No description for this lesson.
          </p>
        )}
      </div>
    </div>
  );
}
