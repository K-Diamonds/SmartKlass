'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AccessPlansClient } from '@/components/studio/AccessPlansClient';
import { listCreatorCourseAccessPlans } from '@/lib/api/access-plans';
import { getAuthToken } from '@/lib/api/client';
import { loadStudioCourseWithFallback } from '@/lib/studio/load-studio-course';
import {
  apiAccessPlanToStudio,
  buildDefaultAccessPlans,
} from '@/lib/studio/map-access-plan';
import { loadStudioPlans } from '@/lib/studio/session-plans';
import type { StudioAccessPlan } from '@/lib/studio/types';

type AccessPlansLoaderProps = {
  courseId: string;
};

function resolveInitialPlans(courseId: string): StudioAccessPlan[] {
  const storedPlans = loadStudioPlans(courseId);
  if (storedPlans && storedPlans.length > 0) {
    return storedPlans;
  }

  return buildDefaultAccessPlans(courseId);
}

export function AccessPlansLoader({ courseId }: AccessPlansLoaderProps) {
  const [courseTitle, setCourseTitle] = useState<string | null>(null);
  const [plans, setPlans] = useState<StudioAccessPlan[] | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadPlans() {
      const course = await loadStudioCourseWithFallback(courseId);

      if (cancelled) {
        return;
      }

      if (!course) {
        setMissing(true);
        return;
      }

      setCourseTitle(course.title);

      if (getAuthToken()) {
        try {
          const apiPlans = await listCreatorCourseAccessPlans(courseId);
          if (!cancelled) {
            setPlans(
              apiPlans.length > 0
                ? apiPlans.map(apiAccessPlanToStudio)
                : buildDefaultAccessPlans(courseId),
            );
          }
          return;
        } catch {
          // Fall through to local defaults when the API is unavailable.
        }
      }

      if (!cancelled) {
        setPlans(resolveInitialPlans(courseId));
      }
    }

    void loadPlans();

    return () => {
      cancelled = true;
    };
  }, [courseId]);

  if (missing) {
    return (
      <div className="rounded-2xl border border-border-subtle bg-surface p-8 text-center shadow-soft">
        <p className="text-sm text-muted-foreground">
          Course not found. Open the builder from your courses list first.
        </p>
        <Link
          href="/studio/courses"
          className="mt-4 inline-block text-sm font-medium text-accent hover:underline"
        >
          Go to courses
        </Link>
      </div>
    );
  }

  if (!courseTitle || plans === null) {
    return (
      <div className="rounded-2xl border border-border-subtle bg-surface p-8 text-center shadow-soft">
        <p className="text-sm text-muted-foreground">Loading subscriber pricing…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href={`/studio/courses/${courseId}/builder`}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to builder
      </Link>
      <AccessPlansClient courseId={courseId} courseTitle={courseTitle} plans={plans} />
    </div>
  );
}
