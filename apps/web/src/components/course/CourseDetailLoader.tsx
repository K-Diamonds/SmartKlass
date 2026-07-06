'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  listCreatorCourseAccessPlans,
  listCourseAccessPlans,
} from '@/lib/api/access-plans';
import { getAuthToken } from '@/lib/api/client';
import { getPublishedCourseById } from '@/lib/api/courses';
import { detailToDisplayCourse } from '@/lib/catalog/course-display';
import { CourseDetailView } from '@/components/course/CourseDetailView';
import type { ModuleItem } from '@/components/player/LessonPlayer';
import { loadStudioCourseWithFallback } from '@/lib/studio/load-studio-course';
import {
  apiAccessPlanToStudio,
  buildDefaultAccessPlans,
} from '@/lib/studio/map-access-plan';
import {
  studioCourseToDisplayCourse,
  studioCourseToModuleItems,
} from '@/lib/studio/map-preview';
import { loadStudioPlans } from '@/lib/studio/session-plans';
import type { StudioAccessPlan } from '@/lib/studio/types';

type CourseDetailLoaderProps = {
  courseId: string;
  preview?: boolean;
};

function resolvePreviewPlans(courseId: string): StudioAccessPlan[] {
  const storedPlans = loadStudioPlans(courseId);
  if (storedPlans && storedPlans.length > 0) {
    return storedPlans;
  }

  return buildDefaultAccessPlans(courseId);
}

async function resolvePreviewPlansWithApi(
  courseId: string,
): Promise<StudioAccessPlan[]> {
  const localPlans = resolvePreviewPlans(courseId);

  if (!getAuthToken()) {
    return localPlans;
  }

  try {
    const apiPlans = await listCreatorCourseAccessPlans(courseId);
    if (apiPlans.length > 0) {
      return apiPlans.map(apiAccessPlanToStudio);
    }
  } catch {
    // Use local/session plans when creator API is unavailable.
  }

  return localPlans;
}

export function CourseDetailLoader({ courseId, preview = false }: CourseDetailLoaderProps) {
  const [missing, setMissing] = useState(false);
  const [loaded, setLoaded] = useState<{
    course: Parameters<typeof CourseDetailView>[0]['course'];
    modules?: ModuleItem[];
    isCreatorPreview: boolean;
    studioPlans?: StudioAccessPlan[];
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCourse() {
      if (preview) {
        const storedCourse = await loadStudioCourseWithFallback(courseId);
        if (cancelled) {
          return;
        }

        if (storedCourse) {
          const plans = await resolvePreviewPlansWithApi(courseId);
          if (cancelled) {
            return;
          }

          setLoaded({
            course: studioCourseToDisplayCourse(storedCourse, plans),
            modules: studioCourseToModuleItems(storedCourse),
            isCreatorPreview: true,
            studioPlans: plans,
          });
          return;
        }

        setMissing(true);
        return;
      }

      try {
        const apiCourse = await getPublishedCourseById(courseId);
        let priceFromCents = 0;
        try {
          const plans = await listCourseAccessPlans(courseId);
          const paid = plans.filter((p) => p.priceCents > 0);
          if (paid.length > 0) {
            priceFromCents = Math.min(...paid.map((p) => p.priceCents));
          }
        } catch {
          // Pricing optional for display.
        }

        if (!cancelled) {
          setLoaded({
            course: detailToDisplayCourse(apiCourse, { priceFromCents }),
            isCreatorPreview: false,
          });
          return;
        }
      } catch {
        // Fall through to not-found.
      }

      if (!cancelled) {
        setMissing(true);
      }
    }

    void loadCourse();

    return () => {
      cancelled = true;
    };
  }, [courseId, preview]);

  if (missing) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="text-2xl font-semibold text-foreground">Course not found</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {preview
            ? 'Save your course in the builder first, then try preview again.'
            : 'This course may be unpublished or no longer available.'}
        </p>
        <Link href="/discover" className="mt-6 inline-block text-sm font-medium text-accent hover:underline">
          Browse courses
        </Link>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center text-sm text-muted-foreground">
        Loading course…
      </div>
    );
  }

  return (
    <CourseDetailView
      course={loaded.course}
      modules={loaded.modules}
      isCreatorPreview={loaded.isCreatorPreview}
      studioPlans={loaded.studioPlans}
    />
  );
}
