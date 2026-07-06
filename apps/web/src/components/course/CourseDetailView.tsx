import Link from 'next/link';
import { Suspense } from 'react';
import { CoursePreviewVideo } from '@/components/course/CoursePreviewVideo';
import { CoursePricingPlans } from '@/components/course/CoursePricingPlans';
import { hasPreviewMaterialsDescription } from '@/components/course/PreviewMaterialsList';
import type { ModuleItem } from '@/components/player/LessonPlayer';
import { CourseCreatorPreview } from '@/components/course/CourseCreatorPreview';
import { CourseThumbnailImage } from '@/components/course/CourseThumbnailImage';
import type { CourseDisplay } from '@/lib/catalog/display-types';
import { discoverCreatorUrl } from '@/lib/discover';
import { formatCourseDurationHours } from '@/lib/studio/course-difficulty';
import type { StudioAccessPlan } from '@/lib/studio/types';

type CourseDetailViewProps = {
  course: CourseDisplay;
  modules?: ModuleItem[];
  isCreatorPreview?: boolean;
  studioPlans?: StudioAccessPlan[];
};

export function CourseDetailView({
  course,
  modules,
  isCreatorPreview = false,
  studioPlans,
}: CourseDetailViewProps) {
  if (isCreatorPreview) {
    return (
      <CourseCreatorPreview
        course={course}
        modules={modules ?? []}
        studioPlans={studioPlans}
      />
    );
  }

  return (
    <div>
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
                  ★ {course.rating} ({course.reviewCount} reviews)
                </span>
                <span>{course.lessonCount} lessons</span>
                <span>{formatCourseDurationHours(course.durationHours)}</span>
                <span>{course.level}</span>
              </div>

              <div className="mt-8 flex items-center gap-4">
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

      <section className="border-b border-border-subtle bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Preview the course
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {course.trailerYoutubeId
              ? 'Watch the free preview video before you subscribe.'
              : hasPreviewMaterialsDescription(course.previewMaterialsDescription)
                ? 'See what materials are included before you subscribe.'
                : 'Preview video coming soon.'}
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

      <section className="border-b border-border-subtle bg-cream">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Choose your plan
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick the access option that works best for you.
          </p>
          <div className="mt-8">
            <Suspense fallback={<p className="text-sm text-muted-foreground">Loading plans…</p>}>
              <CoursePricingPlans courseId={course.id} />
            </Suspense>
          </div>
        </div>
      </section>
    </div>
  );
}
