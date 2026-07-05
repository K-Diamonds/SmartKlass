'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { EmptyState } from '@/components';
import { useAuthSession } from '@/hooks/useAuthSession';
import { getMyLibrary, type LibraryCourse } from '@/lib/api/users';

const FALLBACK_THUMBNAIL =
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=500&fit=crop';

export function LibraryPageClient() {
  const { isAuthenticated, isLoading: authLoading } = useAuthSession();
  const [courses, setCourses] = useState<LibraryCourse[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setCourses([]);
      setReady(true);
      return;
    }

    let cancelled = false;

    async function loadLibrary() {
      try {
        const items = await getMyLibrary();
        if (!cancelled) {
          setCourses(items);
        }
      } catch {
        if (!cancelled) {
          setCourses([]);
        }
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    }

    void loadLibrary();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  if (authLoading || !ready) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Library</h1>
        <p className="mt-8 text-sm text-muted-foreground">Loading your library…</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Library</h1>
      <p className="mt-1 text-muted-foreground">Courses you have access to</p>

      {courses.length > 0 ? (
        <div className="mt-8 grid gap-4">
          {courses.map((course) => (
            <div
              key={course.courseId}
              className="card-hover flex items-center gap-4 rounded-xl border border-border-subtle bg-surface p-4"
            >
              <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg">
                <Image
                  src={course.thumbnailUrl ?? FALLBACK_THUMBNAIL}
                  alt={course.title}
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-foreground">{course.title}</h3>
                <p className="text-sm text-muted-foreground">{course.accessLabel}</p>
              </div>
              <Link
                href={
                  course.firstLessonId
                    ? `/learn/${course.slug}/lessons/${course.firstLessonId}?courseId=${course.courseId}`
                    : `/courses?id=${encodeURIComponent(course.courseId)}`
                }
                className="text-sm font-medium text-accent"
              >
                Watch →
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          className="mt-8"
          title="Your library is empty"
          description="Purchase a course or start a subscription to see it here."
          action={
            <Link
              href="/discover"
              className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background"
            >
              Browse courses
            </Link>
          }
        />
      )}
    </div>
  );
}
