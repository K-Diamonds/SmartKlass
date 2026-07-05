'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { APP_NAME } from '@smartklass/shared';
import { ApiRequestError } from '@/lib/api/types';
import {
  fetchCourseWatch,
  fetchLessonWatch,
  type CourseWatchData,
  type LessonWatchData,
} from '@/lib/api/watch';
import {
  getCourseProgress,
  markLessonVisited,
  setContinueLearning,
} from '@/lib/learn/progress';
import { LearnComments } from './LearnComments';
import { LearnErrorState } from './LearnErrorState';
import { LearnLoadingSkeleton } from './LearnLoadingSkeleton';
import { LearnMainPanel } from './LearnMainPanel';
import { LearnResources } from './LearnResources';
import {
  LearnSidebar,
  mapCourseWatchToSidebar,
  type SidebarModule,
} from './LearnSidebar';

type LearnExperienceProps = {
  courseSlug: string;
  lessonId: string;
  courseIdHint?: string;
};

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'ready';
      lesson: LessonWatchData | null;
      lessonLocked: boolean;
      courseWatch: CourseWatchData | null;
      hasFullAccess: boolean;
      modules: SidebarModule[];
      courseId: string;
      courseTitle: string;
      completedLessonIds: string[];
    };

export function LearnExperience({
  courseSlug,
  lessonId,
  courseIdHint,
}: LearnExperienceProps) {
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  const loadExperience = useCallback(async () => {
    await Promise.resolve();
    setState({ status: 'loading' });

    let lesson: LessonWatchData | null = null;
    let lessonLocked = false;
    let resolvedCourseId = courseIdHint ?? '';

    try {
      lesson = await fetchLessonWatch(lessonId);
      resolvedCourseId = lesson.courseId;
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 403) {
        lessonLocked = true;
        resolvedCourseId = courseIdHint ?? resolvedCourseId;
      } else if (error instanceof ApiRequestError && error.status === 401) {
        setState({
          status: 'error',
          message: 'Sign in to watch this lesson.',
        });
        return;
      } else if (error instanceof ApiRequestError) {
        setState({
          status: 'error',
          message: error.message,
        });
        return;
      } else {
        setState({
          status: 'error',
          message: 'Unable to load this lesson. Check your connection and try again.',
        });
        return;
      }
    }

    if (!resolvedCourseId && lesson) {
      resolvedCourseId = lesson.courseId;
    }

    let courseWatch: CourseWatchData | null = null;
    let hasFullAccess = false;
    let modules: SidebarModule[] = [];
    let courseTitle = courseSlug.replace(/-/g, ' ');

    if (resolvedCourseId) {
      try {
        courseWatch = await fetchCourseWatch(resolvedCourseId);
        hasFullAccess = courseWatch.access.hasAccess;
        courseTitle = courseWatch.course.title;
        modules = mapCourseWatchToSidebar(courseWatch);
      } catch {
        // Sidebar unavailable without course access.
      }
    }

    const progress = resolvedCourseId
      ? getCourseProgress(resolvedCourseId)
      : null;

    if (lesson && !lessonLocked) {
      markLessonVisited(courseSlug, lesson.courseId, lesson.id);
      setContinueLearning({
        courseSlug,
        courseId: lesson.courseId,
        lessonId: lesson.id,
        courseTitle,
        lessonTitle: lesson.title,
      });
    }

    setState({
      status: 'ready',
      lesson,
      lessonLocked,
      courseWatch,
      hasFullAccess,
      modules,
      courseId: resolvedCourseId || lesson?.courseId || '',
      courseTitle,
      completedLessonIds: progress?.completedLessonIds ?? [],
    });
  }, [courseSlug, lessonId, courseIdHint]);

  /* eslint-disable react-hooks/set-state-in-effect -- loads watch API data when route params change */
  useEffect(() => {
    void loadExperience();
  }, [loadExperience]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (state.status === 'loading') {
    return <LearnLoadingSkeleton />;
  }

  if (state.status === 'error') {
    return (
      <LearnErrorState message={state.message} onRetry={() => void loadExperience()} />
    );
  }

  const lockedLessonMeta = state.modules
    .flatMap((module) => module.lessons)
    .find((item) => item.id === lessonId);

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/library"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            ← Library
          </Link>
          <p className="mt-1 text-sm text-muted-foreground">{state.courseTitle}</p>
        </div>
        {!state.lessonLocked && state.lesson && (
          <button
            type="button"
            onClick={() => {
              if (!state.lesson) {
                return;
              }

              markLessonVisited(
                courseSlug,
                state.lesson.courseId,
                state.lesson.id,
              );

              setState((current) =>
                current.status === 'ready'
                  ? {
                      ...current,
                      completedLessonIds: Array.from(
                        new Set([
                          ...current.completedLessonIds,
                          state.lesson!.id,
                        ]),
                      ),
                    }
                  : current,
              );
            }}
            className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-border-subtle"
          >
            Mark complete
          </button>
        )}
      </header>

      <div className="flex flex-col gap-8 xl:flex-row xl:items-start">
        <div className="min-w-0 flex-1 space-y-8">
          <LearnMainPanel
            courseSlug={courseSlug}
            courseTitle={state.courseTitle}
            lesson={state.lessonLocked ? null : state.lesson}
            locked={state.lessonLocked}
            lockedLessonTitle={lockedLessonMeta?.title}
          />

          {!state.lessonLocked && state.lesson && (
            <>
              <LearnResources resources={state.lesson.resources} />
              <LearnComments />
            </>
          )}
        </div>

        <LearnSidebar
          className="w-full xl:w-96"
          courseSlug={courseSlug}
          courseId={state.courseId || undefined}
          courseTitle={state.courseTitle}
          modules={state.modules}
          activeLessonId={lessonId}
          hasFullAccess={state.hasFullAccess}
          completedLessonIds={state.completedLessonIds}
        />
      </div>

      <p className="mt-10 text-center text-xs text-muted-foreground">
        {APP_NAME} streams lessons via YouTube — no video uploads required.
      </p>
    </div>
  );
}
