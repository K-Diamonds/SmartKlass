'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CourseBuilderClient } from '@/components/studio/CourseBuilderClient';
import { loadStudioCourseWithFallback } from '@/lib/studio/load-studio-course';
import type { StudioCourse } from '@/lib/studio/types';

type CourseBuilderLoaderProps = {
  courseId: string;
};

export function CourseBuilderLoader({ courseId }: CourseBuilderLoaderProps) {
  const searchParams = useSearchParams();
  const certificateEnabled = searchParams.get('certificate') === 'enabled';
  const [course, setCourse] = useState<StudioCourse | null>(null);
  const [missing, setMissing] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadCourse() {
      const loadedCourse = await loadStudioCourseWithFallback(courseId);

      if (cancelled) {
        return;
      }

      if (loadedCourse) {
        setCourse(loadedCourse);
        return;
      }

      setMissing(true);
    }

    void loadCourse();

    return () => {
      cancelled = true;
    };
  }, [courseId, reloadKey]);

  useEffect(() => {
    if (certificateEnabled) {
      setReloadKey((current) => current + 1);
    }
  }, [certificateEnabled]);

  if (missing) {
    return (
      <div className="rounded-2xl border border-border-subtle bg-surface p-8 text-center shadow-soft">
        <p className="text-sm text-muted-foreground">
          Course not found. Sign in as the course creator, or create a new draft from your courses
          list.
        </p>
        <Link
          href="/studio/courses"
          className="mt-4 inline-block text-sm font-medium text-accent hover:underline"
        >
          Back to courses
        </Link>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="rounded-2xl border border-border-subtle bg-surface p-8 text-center shadow-soft">
        <p className="text-sm text-muted-foreground">Loading course builder…</p>
      </div>
    );
  }

  return <CourseBuilderClient course={course} />;
}
