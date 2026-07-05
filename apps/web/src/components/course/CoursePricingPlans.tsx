'use client';

import { Suspense, useEffect, useState } from 'react';
import { PricingCard } from '@/components/cards/PricingCard';
import { CourseSubscribeButton } from '@/components/course/CourseSubscribeButton';
import {
  listCourseAccessPlans,
  listCreatorCourseAccessPlans,
} from '@/lib/api/access-plans';
import { getAuthToken } from '@/lib/api/client';
import {
  apiPlanToDisplayPlan,
  buildDefaultAccessPlans,
  sortDisplayPlans,
  studioPlansToDisplayPlans,
  type DisplayPricingPlan,
} from '@/lib/studio/map-access-plan';
import type { StudioAccessPlan } from '@/lib/studio/types';
import { cn } from '@/lib/utils';

type CoursePricingPlansProps = {
  courseId: string;
  studioPlans?: StudioAccessPlan[];
  previewMode?: boolean;
  className?: string;
};

async function loadDisplayPlans(
  courseId: string,
  previewMode: boolean,
  studioPlans?: StudioAccessPlan[],
): Promise<DisplayPricingPlan[]> {
  if (studioPlans?.length) {
    return studioPlansToDisplayPlans(studioPlans);
  }

  if (previewMode && getAuthToken()) {
    try {
      const apiPlans = await listCreatorCourseAccessPlans(courseId);
      const displayPlans = sortDisplayPlans(
        apiPlans
          .map((plan) => apiPlanToDisplayPlan(plan))
          .filter((plan): plan is DisplayPricingPlan => plan !== null),
      );

      if (displayPlans.length > 0) {
        return displayPlans;
      }
    } catch {
      // Fall through to local preview defaults.
    }
  }

  if (previewMode) {
    return studioPlansToDisplayPlans(buildDefaultAccessPlans(courseId));
  }

  try {
    const apiPlans = await listCourseAccessPlans(courseId);
    return sortDisplayPlans(
      apiPlans
        .map((plan) => apiPlanToDisplayPlan(plan))
        .filter((plan): plan is DisplayPricingPlan => plan !== null),
    );
  } catch {
    return [];
  }
}

function CoursePricingPlansContent({
  courseId,
  studioPlans,
  previewMode = false,
  className,
}: CoursePricingPlansProps) {
  const [plans, setPlans] = useState<DisplayPricingPlan[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const displayPlans = await loadDisplayPlans(
          courseId,
          previewMode,
          studioPlans,
        );

        if (!cancelled) {
          setPlans(displayPlans);
          setError(
            displayPlans.length === 0
              ? 'No paid plans are available for this course yet.'
              : null,
          );
        }
      } catch {
        if (!cancelled) {
          setPlans([]);
          setError('Could not load pricing plans.');
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [courseId, previewMode, studioPlans]);

  if (plans === null) {
    return (
      <p className={cn('text-sm text-muted-foreground', className)}>
        Loading pricing plans…
      </p>
    );
  }

  if (error || plans.length === 0) {
    return (
      <p className={cn('text-sm text-muted-foreground', className)} role="status">
        {error ?? 'No paid plans are available for this course yet.'}
      </p>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {previewMode && (
        <p className="text-sm text-muted-foreground">
          Learners choose a plan below when they subscribe.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan) => (
          <PricingCard
            key={plan.id}
            variant="marketing"
            plan={plan}
            className="p-6"
            action={
              plan.previewOnly ? (
                <button
                  type="button"
                  disabled
                  className="mt-8 w-full rounded-full bg-foreground py-3 text-sm font-semibold text-background opacity-60"
                  title="Save pricing in Studio to enable checkout"
                >
                  Subscribe
                </button>
              ) : (
                <CourseSubscribeButton
                  courseId={courseId}
                  accessPlanId={plan.id}
                  label="Subscribe"
                  ownerPreview={previewMode}
                  className="w-full"
                />
              )
            }
          />
        ))}
      </div>
    </div>
  );
}

export function CoursePricingPlans(props: CoursePricingPlansProps) {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-muted-foreground">Loading pricing plans…</p>
      }
    >
      <CoursePricingPlansContent {...props} />
    </Suspense>
  );
}
