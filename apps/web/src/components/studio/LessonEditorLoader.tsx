'use client';

import { useEffect, useState } from 'react';
import { LessonEditorClient } from '@/components/studio/LessonEditorClient';
import { getStudioLesson } from '@/lib/studio/mock-data';
import { loadStudioCourseWithFallback } from '@/lib/studio/load-studio-course';
import type { StudioLesson } from '@/lib/studio/types';

type LessonEditorLoaderProps = {
  courseId: string;
  lessonId: string;
};

type LoadedLesson = {
  courseId: string;
  courseTitle: string;
  moduleTitle: string;
  lesson: StudioLesson;
};

export function LessonEditorLoader({ courseId, lessonId }: LessonEditorLoaderProps) {
  const [data, setData] = useState<LoadedLesson | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadLesson() {
      const mockResult = getStudioLesson(courseId, lessonId);
      if (mockResult) {
        if (!cancelled) {
          setData({
            courseId: mockResult.course.id,
            courseTitle: mockResult.course.title,
            moduleTitle: mockResult.module.title,
            lesson: mockResult.lesson,
          });
        }
        return;
      }

      const course = await loadStudioCourseWithFallback(courseId);
      if (cancelled) {
        return;
      }

      if (course) {
        for (const courseModule of course.modules) {
          const storedLesson = courseModule.lessons.find((item) => item.id === lessonId);
          if (storedLesson) {
            setData({
              courseId: course.id,
              courseTitle: course.title,
              moduleTitle: courseModule.title,
              lesson: storedLesson,
            });
            return;
          }
        }
      }

      setMissing(true);
    }

    void loadLesson();

    return () => {
      cancelled = true;
    };
  }, [courseId, lessonId]);

  if (missing) {
    return (
      <div className="rounded-2xl border border-border-subtle bg-surface p-8 text-center shadow-soft">
        <p className="text-sm text-muted-foreground">
          Lesson not found. Return to the course builder and try again.
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-border-subtle bg-surface p-8 text-center shadow-soft">
        <p className="text-sm text-muted-foreground">Loading lesson…</p>
      </div>
    );
  }

  return (
    <LessonEditorClient
      courseId={data.courseId}
      courseTitle={data.courseTitle}
      moduleTitle={data.moduleTitle}
      lesson={data.lesson}
    />
  );
}
