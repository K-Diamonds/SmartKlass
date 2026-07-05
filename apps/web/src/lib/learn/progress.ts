const CONTINUE_KEY = 'smartklass_continue_learning';
const PROGRESS_PREFIX = 'smartklass_progress_';

export type ContinueLearning = {
  courseSlug: string;
  courseId: string;
  lessonId: string;
  courseTitle: string;
  lessonTitle: string;
  updatedAt: string;
};

export type CourseProgress = {
  courseSlug: string;
  courseId: string;
  completedLessonIds: string[];
  lastLessonId: string;
  lastVisitedAt: string;
};

function canUseStorage(): boolean {
  return typeof window !== 'undefined';
}

/** Placeholder: persist where the learner should resume. */
export function getContinueLearning(): ContinueLearning | null {
  if (!canUseStorage()) {
    return null;
  }

  const raw = localStorage.getItem(CONTINUE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as ContinueLearning;
  } catch {
    return null;
  }
}

export function setContinueLearning(entry: Omit<ContinueLearning, 'updatedAt'>): void {
  if (!canUseStorage()) {
    return;
  }

  localStorage.setItem(
    CONTINUE_KEY,
    JSON.stringify({
      ...entry,
      updatedAt: new Date().toISOString(),
    } satisfies ContinueLearning),
  );
}

export function clearContinueLearning(): void {
  if (!canUseStorage()) {
    return;
  }

  localStorage.removeItem(CONTINUE_KEY);
}

function progressKey(courseId: string): string {
  return `${PROGRESS_PREFIX}${courseId}`;
}

export function getCourseProgress(courseId: string): CourseProgress | null {
  if (!canUseStorage()) {
    return null;
  }

  const raw = localStorage.getItem(progressKey(courseId));

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as CourseProgress;
  } catch {
    return null;
  }
}

export function markLessonVisited(
  courseSlug: string,
  courseId: string,
  lessonId: string,
): CourseProgress {
  const existing = getCourseProgress(courseId);

  const progress: CourseProgress = {
    courseSlug,
    courseId,
    completedLessonIds: existing?.completedLessonIds ?? [],
    lastLessonId: lessonId,
    lastVisitedAt: new Date().toISOString(),
  };

  if (canUseStorage()) {
    localStorage.setItem(progressKey(courseId), JSON.stringify(progress));
  }

  return progress;
}

/** Placeholder: mark a lesson complete when the user finishes watching. */
export function markLessonCompleted(
  courseSlug: string,
  courseId: string,
  lessonId: string,
): CourseProgress {
  const existing = getCourseProgress(courseId);
  const completed = new Set(existing?.completedLessonIds ?? []);

  completed.add(lessonId);

  const progress: CourseProgress = {
    courseSlug,
    courseId,
    completedLessonIds: Array.from(completed),
    lastLessonId: lessonId,
    lastVisitedAt: new Date().toISOString(),
  };

  if (canUseStorage()) {
    localStorage.setItem(progressKey(courseId), JSON.stringify(progress));
  }

  return progress;
}

export function getContinueLearningUrl(entry: ContinueLearning): string {
  const params = new URLSearchParams({ courseId: entry.courseId });
  return `/learn/${entry.courseSlug}/lessons/${entry.lessonId}?${params.toString()}`;
}
