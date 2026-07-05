'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { StudioPageHeader, StudioStatCard } from '@/components/studio/StudioPageHeader';
import { CreatorPayoutSummaryCard } from '@/components/studio/CreatorPayoutSummaryCard';
import { CourseStatusBadge, normalizeCourseStatus } from '@/components/studio/StudioBadges';
import { listMyCourses, type CreatorCourseListItem } from '@/lib/api/courses';

const FALLBACK_THUMBNAIL =
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=500&fit=crop';

export function StudioDashboardClient() {
  const [courses, setCourses] = useState<CreatorCourseListItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadCourses() {
      try {
        const items = await listMyCourses();
        if (!cancelled) {
          setCourses(Array.isArray(items) ? items : []);
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

    void loadCourses();

    return () => {
      cancelled = true;
    };
  }, []);

  const publishedCount = courses.filter((course) => course.status === 'PUBLISHED').length;

  return (
    <div className="space-y-10">
      <StudioPageHeader
        eyebrow="Creator Studio"
        title="Dashboard"
        description="YouTube Studio clarity, Stripe-grade revenue insights, and Coursera-style course management."
        actions={
          <Link
            href="/studio/courses/new"
            className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            + New course
          </Link>
        }
      />

      <CreatorPayoutSummaryCard />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StudioStatCard
          label="Published courses"
          value={ready ? String(publishedCount) : '…'}
          change={ready ? `${courses.length} total` : '…'}
          trend="neutral"
        />
        <StudioStatCard
          label="Total learners"
          value={ready ? '0' : '…'}
          change="Start publishing to grow"
          trend="neutral"
        />
        <StudioStatCard
          label="Revenue (all time)"
          value={ready ? '$0' : '…'}
          change="No earnings yet"
          trend="neutral"
        />
        <StudioStatCard
          label="Active subscribers"
          value={ready ? '0' : '…'}
          change="No subscribers yet"
          trend="neutral"
        />
      </div>

      <section className="rounded-2xl border border-border-subtle bg-surface p-6 shadow-soft">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Your courses</h2>
          <Link href="/studio/courses" className="text-sm text-accent hover:underline">
            View all
          </Link>
        </div>

        {!ready ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading courses…</p>
        ) : courses.length > 0 ? (
          <div className="mt-4 space-y-3">
            {courses.slice(0, 5).map((course) => (
              <div
                key={course.id}
                className="flex items-center gap-4 rounded-xl border border-border-subtle p-4 transition-colors hover:bg-border-subtle/50"
              >
                <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg">
                  <Image
                    src={course.thumbnailUrl ?? FALLBACK_THUMBNAIL}
                    alt={course.title}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium text-foreground">{course.title}</h3>
                    <CourseStatusBadge status={normalizeCourseStatus(course.status)} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {course.lessonCount} lessons · {course.moduleCount} modules
                  </p>
                </div>
                <Link
                  href={`/studio/courses/${course.id}/builder`}
                  className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-border-subtle"
                >
                  Open builder
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-border px-6 py-10 text-center">
            <p className="text-sm font-medium text-foreground">No courses yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Create your first draft to start building your catalog.
            </p>
            <Link
              href="/studio/courses/new"
              className="mt-4 inline-flex rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background"
            >
              Create course
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
