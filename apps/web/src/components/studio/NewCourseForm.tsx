'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createCourse } from '@/lib/api/courses';
import { getAuthToken } from '@/lib/api/client';
import { ApiRequestError } from '@/lib/api/types';
import { CourseThumbnailField } from '@/components/studio/CourseThumbnailField';
import { FilterSelect } from '@/components/ui/FilterSelect';
import { toStudioCourse } from '@/lib/studio/map-course';
import { saveStudioCourse } from '@/lib/studio/session-course';

type SaveIntent = 'draft' | 'next';

export function NewCourseForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Culinary');
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [thumbnailError, setThumbnailError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [needsSignIn, setNeedsSignIn] = useState(false);

  const handleSubmit = async (intent: SaveIntent) => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Course title is required.');
      return;
    }

    const token = getAuthToken();
    if (!token) {
      setNeedsSignIn(true);
      setError('Sign in as a creator to save a course draft.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setNeedsSignIn(false);

    try {
      const course = await createCourse({
        title: trimmedTitle,
        subtitle: subtitle.trim() || undefined,
        description: description.trim() || 'Draft course.',
        thumbnailUrl: thumbnailUrl ?? undefined,
      });

      const studioCourse = toStudioCourse(course);
      saveStudioCourse(studioCourse);

      if (intent === 'next') {
        router.push(`/studio/courses/${course.id}/builder`);
        return;
      }

      router.push('/studio/courses');
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.message
          : 'Could not save the course draft. Try again.';
      setError(message);

      if (err instanceof ApiRequestError && err.status === 401) {
        setNeedsSignIn(true);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form
      className="max-w-2xl space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        void handleSubmit('draft');
      }}
    >
      <section className="rounded-2xl border border-border-subtle bg-surface p-6 shadow-soft">
        <h2 className="text-sm font-medium text-foreground">Course details</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="title" className="block text-xs font-medium text-muted-foreground">
              Course title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Pasta Basics"
              className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none ring-ring focus:ring-2"
            />
          </div>
          <div>
            <label htmlFor="subtitle" className="block text-xs font-medium text-muted-foreground">
              Subtitle
            </label>
            <input
              id="subtitle"
              type="text"
              value={subtitle}
              onChange={(event) => setSubtitle(event.target.value)}
              placeholder="A short hook for your sales page"
              className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none ring-ring focus:ring-2"
            />
          </div>
          <div>
            <label
              htmlFor="description"
              className="block text-xs font-medium text-muted-foreground"
            >
              Description
            </label>
            <textarea
              id="description"
              rows={5}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What will learners achieve by the end of this course?"
              className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none ring-ring focus:ring-2"
            />
          </div>
          <div>
            <label htmlFor="category" className="block text-xs font-medium text-muted-foreground">
              Category
            </label>
            <FilterSelect
              id="category"
              value={category}
              onChange={setCategory}
              className="mt-1.5"
              selectClassName="py-3"
            >
              <option>Culinary</option>
              <option>Music</option>
              <option>Design</option>
              <option>Business</option>
              <option>Wellness</option>
            </FilterSelect>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border-subtle bg-surface p-6 shadow-soft">
        <h2 className="text-sm font-medium text-foreground">Thumbnail</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Recommended 16:9. Appears on discover and your course landing page.
        </p>
        <div className="mt-4">
          <CourseThumbnailField
            thumbnailUrl={thumbnailUrl}
            onThumbnailChange={setThumbnailUrl}
            onError={setThumbnailError}
            disabled={isSaving}
          />
        </div>
        {thumbnailError && (
          <p className="mt-2 text-sm text-destructive" role="alert">
            {thumbnailError}
          </p>
        )}
      </section>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
          {needsSignIn && (
            <>
              {' '}
              <Link href="/login" className="font-medium underline">
                Sign in
              </Link>
            </>
          )}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-full bg-foreground px-6 py-2.5 text-sm font-medium text-background disabled:opacity-60"
        >
          {isSaving ? 'Saving…' : 'Save draft'}
        </button>
        <button
          type="button"
          disabled={isSaving}
          onClick={() => void handleSubmit('next')}
          className="rounded-full border border-border px-6 py-2.5 text-sm font-medium text-foreground hover:bg-border-subtle disabled:opacity-60"
        >
          Next
        </button>
      </div>
    </form>
  );
}
