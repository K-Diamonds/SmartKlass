'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import {
  getContinueLearning,
  getContinueLearningUrl,
  type ContinueLearning,
} from '@/lib/learn/progress';

function subscribeNoop(): () => void {
  return () => {};
}

function getServerSnapshot(): ContinueLearning | null {
  return null;
}

export function ContinueLearningCard() {
  const entry = useSyncExternalStore(
    subscribeNoop,
    getContinueLearning,
    getServerSnapshot,
  );

  if (!entry) {
    return (
      <section className="rounded-2xl border border-dashed border-border-subtle bg-surface p-6 text-center">
        <p className="text-sm font-medium text-foreground">Continue learning</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Start a course and your progress will appear here.
        </p>
        <Link
          href="/discover"
          className="mt-4 inline-block text-sm font-medium text-accent hover:underline"
        >
          Discover courses →
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border-subtle bg-surface p-6 shadow-soft">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Continue learning
      </p>
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-accent-muted text-xl text-accent">
          ▶
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold text-foreground">
            {entry.courseTitle}
          </h2>
          <p className="truncate text-sm text-muted-foreground">
            {entry.lessonTitle}
          </p>
        </div>
        <Link
          href={getContinueLearningUrl(entry)}
          className="shrink-0 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          Resume
        </Link>
      </div>
    </section>
  );
}
