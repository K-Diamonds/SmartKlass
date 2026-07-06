'use client';

import { useEffect, useState } from 'react';
import { ModuleBuilderClient } from '@/components/studio/ModuleBuilderClient';
import { loadStudioCourseWithFallback } from '@/lib/studio/load-studio-course';
import type { StudioModule } from '@/lib/studio/types';

type ModuleBuilderLoaderProps = {
  courseId: string;
  moduleId: string;
};

type LoadedModule = {
  courseId: string;
  courseTitle: string;
  module: StudioModule;
};

export function ModuleBuilderLoader({ courseId, moduleId }: ModuleBuilderLoaderProps) {
  const [data, setData] = useState<LoadedModule | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadModule() {
      const course = await loadStudioCourseWithFallback(courseId);
      if (cancelled) {
        return;
      }

      if (course) {
        const storedModule = course.modules.find((item) => item.id === moduleId);
        if (storedModule) {
          setData({
            courseId: course.id,
            courseTitle: course.title,
            module: storedModule,
          });
          return;
        }
      }

      setMissing(true);
    }

    void loadModule();

    return () => {
      cancelled = true;
    };
  }, [courseId, moduleId]);

  if (missing) {
    return (
      <div className="rounded-2xl border border-border-subtle bg-surface p-8 text-center shadow-soft">
        <p className="text-sm text-muted-foreground">
          Module not found. Return to the course builder and try again.
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-border-subtle bg-surface p-8 text-center shadow-soft">
        <p className="text-sm text-muted-foreground">Loading module…</p>
      </div>
    );
  }

  return (
    <ModuleBuilderClient
      courseId={data.courseId}
      courseTitle={data.courseTitle}
      module={data.module}
    />
  );
}
