'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { LessonPlayer } from '@/components';
import { CoursePreviewVideo } from '@/components/course/CoursePreviewVideo';
import { CoursePricingPlans } from '@/components/course/CoursePricingPlans';
import { hasPreviewMaterialsDescription } from '@/components/course/PreviewMaterialsList';
import type { ModuleItem } from '@/components/player/LessonPlayer';
import type { MockCourse } from '@/lib/mock-data';
import { formatCourseDurationHours } from '@/lib/studio/course-difficulty';
import { discoverCreatorUrl } from '@/lib/discover';
import { CourseThumbnailImage } from '@/components/course/CourseThumbnailImage';
import { courseBuilderUrl } from '@/lib/courses';
import type { StudioAccessPlan } from '@/lib/studio/types';
import { cn } from '@/lib/utils';

type PreviewTab = 'visitor' | 'subscriber';

type CourseCreatorPreviewProps = {
  course: MockCourse;
  modules: ModuleItem[];
  studioPlans?: StudioAccessPlan[];
};

const tabs: Array<{ id: PreviewTab; label: string; description: string }> = [
  {
    id: 'visitor',
    label: 'Not subscribed',
    description: 'What visitors see before they subscribe',
  },
  {
    id: 'subscriber',
    label: 'Subscribed',
    description: 'Full access for active subscribers',
  },
];

export function CourseCreatorPreview({
  course,
  modules,
  studioPlans,
}: CourseCreatorPreviewProps) {
  const [activeTab, setActiveTab] = useState<PreviewTab>('visitor');
  const subscriberAccess = activeTab === 'subscriber';

  return (
    <div>
      <div className="border-b border-accent/30 bg-accent-muted px-4 py-3">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href={courseBuilderUrl(course.id)}
            className="text-sm font-medium text-accent hover:underline"
          >
            ← Back to builder
          </Link>
          <p className="text-sm text-foreground sm:text-center">
            Creator preview — switch tabs to see the course as visitors and subscribers experience it.
          </p>
          <span className="hidden text-sm sm:block sm:w-28 sm:shrink-0" aria-hidden />
        </div>
      </div>

      <div className="border-b border-border-subtle bg-surface">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                  activeTab === tab.id
                    ? 'border-accent bg-accent-muted text-accent'
                    : 'border-border text-muted-foreground hover:border-accent/40 hover:text-foreground',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {activeTab === 'visitor' && (
            <p className="text-sm text-muted-foreground">
              {tabs.find((tab) => tab.id === activeTab)?.description}
            </p>
          )}
        </div>
      </div>

      {!subscriberAccess && (
        <section className="border-b border-border-subtle bg-surface">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              <div>
                <p className="text-sm font-medium text-accent">{course.category}</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  {course.title}
                </h1>
                <p className="mt-3 text-lg text-muted-foreground">{course.subtitle}</p>
                <p className="mt-4 text-muted-foreground">{course.description}</p>

                <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span>
                    ★ {course.rating > 0 ? course.rating.toFixed(1) : 'New'} ({course.reviewCount}{' '}
                    reviews)
                  </span>
                  <span>{course.lessonCount} lessons</span>
                  <span>{formatCourseDurationHours(course.durationHours)}</span>
                  <span>{course.level}</span>
                </div>

                <div className="mt-8">
                  <Link
                    href={discoverCreatorUrl(course.creator.handle)}
                    className="text-sm font-medium text-muted-foreground hover:text-foreground"
                  >
                    By {course.creator.displayName} →
                  </Link>
                </div>
              </div>

              <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-border-subtle shadow-card">
                <CourseThumbnailImage
                  src={course.thumbnailUrl}
                  alt={course.title}
                  priority
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {!subscriberAccess && (
        <section className="border-b border-border-subtle bg-surface">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Preview the course
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {course.trailerYoutubeId
                ? 'Watch the free preview video before subscribing.'
                : hasPreviewMaterialsDescription(course.previewMaterialsDescription)
                  ? 'See what materials are included before subscribing.'
                  : 'Add a preview video in the course builder to show visitors a sample of your course.'}
            </p>
            <div className="mt-8">
              <CoursePreviewVideo
                courseTitle={course.title}
                trailerYoutubeId={course.trailerYoutubeId}
                previewMaterialsDescription={course.previewMaterialsDescription}
              />
            </div>
          </div>
        </section>
      )}

      {!subscriberAccess && (
        <section className="border-b border-border-subtle bg-cream">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Subscribe now
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Pricing plans visitors see before they subscribe.
            </p>
            <div className="mt-8">
              <Suspense fallback={<p className="text-sm text-muted-foreground">Loading plans…</p>}>
                <CoursePricingPlans
                  courseId={course.id}
                  studioPlans={studioPlans}
                  previewMode
                />
              </Suspense>
            </div>
          </div>
        </section>
      )}

      {subscriberAccess && (
        <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {modules.length > 0 ? (
            <LessonPlayer
              key={activeTab}
              courseTitle={course.title}
              modules={modules}
              subscriberAccess
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
              Add modules and lessons in the builder to preview your course content.
            </div>
          )}
        </section>
      )}
    </div>
  );
}
