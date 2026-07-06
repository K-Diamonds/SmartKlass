'use client';

import Link from 'next/link';
import type { CourseWatchData } from '@/lib/api/watch';
import { coursePublicUrl } from '@/lib/courses';
import { cn, formatDuration } from '@/lib/utils';

export type SidebarLesson = {
  id: string;
  moduleId: string;
  title: string;
  durationSeconds: number | null;
  isPreview: boolean;
  sortOrder: number;
};

export type SidebarModule = {
  id: string;
  title: string;
  sortOrder: number;
  lessons: SidebarLesson[];
};

type LearnSidebarProps = {
  courseSlug: string;
  courseId?: string;
  courseTitle?: string;
  modules: SidebarModule[];
  activeLessonId: string;
  hasFullAccess: boolean;
  completedLessonIds: string[];
  className?: string;
};

function lessonHref(
  courseSlug: string,
  lessonId: string,
  courseId?: string,
): string {
  const base = `/learn/${courseSlug}/lessons/${lessonId}`;
  if (!courseId) {
    return base;
  }

  const params = new URLSearchParams({ courseId });
  return `${base}?${params.toString()}`;
}

function isLessonAccessible(
  _lesson: SidebarLesson,
  hasFullAccess: boolean,
): boolean {
  return hasFullAccess;
}

export function LearnSidebar({
  courseSlug,
  courseId,
  courseTitle,
  modules,
  activeLessonId,
  hasFullAccess,
  completedLessonIds,
  className,
}: LearnSidebarProps) {
  const allLessons = modules.flatMap((module) => module.lessons);
  const totalLessons = allLessons.length;
  const completedCount = allLessons.filter((lesson) =>
    completedLessonIds.includes(lesson.id),
  ).length;
  const progressPercent =
    totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  if (modules.length === 0) {
    return (
      <aside
        className={cn(
          'rounded-2xl border border-border-subtle bg-surface p-6 text-center text-sm text-muted-foreground',
          className,
        )}
      >
        <p className="font-medium text-foreground">Course curriculum</p>
        <p className="mt-2">
          Unlock the course to browse all modules and track your progress.
        </p>
        <Link
          href={coursePublicUrl(courseId ?? courseSlug)}
          className="mt-4 inline-block text-sm font-medium text-accent hover:underline"
        >
          View access plans →
        </Link>
      </aside>
    );
  }

  return (
    <aside
      className={cn(
        'flex max-h-[calc(100vh-6rem)] flex-col rounded-2xl border border-border-subtle bg-surface lg:sticky lg:top-20',
        className,
      )}
    >
      <div className="border-b border-border-subtle px-5 py-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Course content
        </p>
        <h2 className="mt-1 line-clamp-2 text-base font-semibold text-foreground">
          {courseTitle ?? 'Your course'}
        </h2>
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{completedCount} of {totalLessons} complete</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border-subtle">
            <div
              className="h-full rounded-full bg-accent transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {modules.map((module) => (
          <div key={module.id}>
            <p className="bg-border-subtle/60 px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {module.title}
            </p>
            <ul>
              {module.lessons.map((lesson) => {
                const accessible = isLessonAccessible(lesson, hasFullAccess);
                const completed = completedLessonIds.includes(lesson.id);
                const active = lesson.id === activeLessonId;

                if (!accessible) {
                  return (
                    <li key={lesson.id}>
                      <div
                        className={cn(
                          'flex items-center gap-3 px-5 py-3 text-sm text-muted-foreground/70',
                          active && 'bg-border-subtle/40',
                        )}
                      >
                        <span className="w-4 shrink-0 text-center text-xs">🔒</span>
                        <span className="line-clamp-1 flex-1">{lesson.title}</span>
                        {lesson.durationSeconds ? (
                          <span className="shrink-0 text-xs opacity-60">
                            {formatDuration(lesson.durationSeconds)}
                          </span>
                        ) : null}
                      </div>
                    </li>
                  );
                }

                return (
                  <li key={lesson.id}>
                    <Link
                      href={lessonHref(courseSlug, lesson.id, courseId)}
                      className={cn(
                        'flex items-center gap-3 px-5 py-3 text-sm transition-colors',
                        active
                          ? 'bg-accent-muted text-accent'
                          : 'text-muted-foreground hover:bg-border-subtle hover:text-foreground',
                      )}
                    >
                      <span className="w-4 shrink-0 text-center text-xs">
                        {completed ? '✓' : '▶'}
                      </span>
                      <span className="line-clamp-1 flex-1">{lesson.title}</span>
                      {lesson.durationSeconds ? (
                        <span className="shrink-0 text-xs opacity-70">
                          {formatDuration(lesson.durationSeconds)}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  );
}

export function mapCourseWatchToSidebar(
  courseWatch: CourseWatchData,
): SidebarModule[] {
  return courseWatch.modules.map((module) => ({
    id: module.id,
    title: module.title,
    sortOrder: module.sortOrder,
    lessons: module.lessons.map((lesson) => ({
      id: lesson.id,
      moduleId: lesson.moduleId,
      title: lesson.title,
      durationSeconds: lesson.durationSeconds,
      isPreview: lesson.isPreview,
      sortOrder: lesson.sortOrder,
    })),
  }));
}
