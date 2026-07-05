import Link from 'next/link';
import { StudioPageHeader } from '@/components/studio/StudioPageHeader';
import { NewCourseForm } from '@/components/studio/NewCourseForm';

export default function NewCoursePage() {
  return (
    <div className="space-y-8">
      <StudioPageHeader
        eyebrow="Create"
        title="New course"
        description="Start with the basics — add modules, lessons, and YouTube videos in the builder."
        actions={
          <Link
            href="/studio/courses"
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-border-subtle"
          >
            Cancel
          </Link>
        }
      />

      <NewCourseForm />
    </div>
  );
}
