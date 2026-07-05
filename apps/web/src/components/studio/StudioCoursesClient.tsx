'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { EmptyState } from '@/components';
import { FilterSelect } from '@/components/ui/FilterSelect';
import { StudioPageHeader } from '@/components/studio/StudioPageHeader';
import { CourseStatusBadge, normalizeCourseStatus } from '@/components/studio/StudioBadges';
import { coursePreviewUrl } from '@/lib/courses';
import { listMyCourses, type CreatorCourseListItem } from '@/lib/api/courses';
import type { CourseStatus } from '@/lib/studio/types';

const FALLBACK_THUMBNAIL =
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=500&fit=crop';

type CourseStatusFilter = 'ALL' | CourseStatus;

export function StudioCoursesClient() {
  const [courses, setCourses] = useState<CreatorCourseListItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<CourseStatusFilter>('ALL');
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

  const filteredCourses = useMemo(() => {
    if (statusFilter === 'ALL') {
      return courses;
    }

    return courses.filter(
      (course) => normalizeCourseStatus(course.status) === statusFilter,
    );
  }, [courses, statusFilter]);

  return (
    <div className="space-y-8">
      <StudioPageHeader
        eyebrow="Content"
        title="Courses"
        description="Manage drafts, published courses, and archived catalogs."
        actions={
          <Link
            href="/studio/courses/new"
            className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background"
          >
            + New course
          </Link>
        }
      />

      {!ready ? (
        <p className="text-sm text-muted-foreground">Loading your courses…</p>
      ) : courses.length > 0 ? (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <label
                htmlFor="course-status-filter"
                className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Status
              </label>
              <FilterSelect
                id="course-status-filter"
                value={statusFilter}
                onChange={(value) => setStatusFilter(value as CourseStatusFilter)}
                aria-label="Filter courses by status"
                className="w-full sm:w-56"
                selectClassName="rounded-xl py-2.5 pl-4 pr-11"
              >
                <option value="ALL">All courses</option>
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="ARCHIVED">Archived</option>
              </FilterSelect>
            </div>
            <p className="text-sm text-muted-foreground">
              {filteredCourses.length} of {courses.length} course
              {courses.length === 1 ? '' : 's'}
            </p>
          </div>

          {filteredCourses.length > 0 ? (
            <div className="space-y-3">
              {filteredCourses.map((course) => (
                <article
                  key={course.id}
                  className="flex flex-col gap-4 rounded-2xl border border-border-subtle bg-surface p-5 shadow-soft transition-shadow hover:shadow-card sm:flex-row sm:items-center"
                >
                  <div className="relative h-20 w-full shrink-0 overflow-hidden rounded-xl sm:h-16 sm:w-28">
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
                      <h3 className="text-lg font-semibold text-foreground">{course.title}</h3>
                      <CourseStatusBadge
                        status={normalizeCourseStatus(course.status)}
                      />
                    </div>
                    {course.subtitle && (
                      <p className="mt-0.5 text-sm text-muted-foreground">{course.subtitle}</p>
                    )}
                    <p className="mt-2 text-sm text-muted-foreground">
                      {course.moduleCount} modules · {course.lessonCount} lessons
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                    <Link
                      href={`/studio/courses/${course.id}/builder`}
                      className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-border-subtle"
                    >
                      Builder
                    </Link>
                    <Link
                      href={`/studio/courses/${course.id}/plans`}
                      className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-border-subtle"
                    >
                      Plans
                    </Link>
                    <Link
                      href={coursePreviewUrl(course.id)}
                      className="rounded-lg px-4 py-2 text-sm font-medium text-accent hover:underline"
                    >
                      Preview
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No courses match this filter"
              description="Try another status or create a new course."
              action={
                <button
                  type="button"
                  onClick={() => setStatusFilter('ALL')}
                  className="rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-border-subtle"
                >
                  Show all courses
                </button>
              }
            />
          )}
        </>
      ) : (
        <EmptyState
          title="No courses yet"
          description="Create your first course and start sharing your expertise."
          action={
            <Link
              href="/studio/courses/new"
              className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background"
            >
              Create course
            </Link>
          }
        />
      )}
    </div>
  );
}
