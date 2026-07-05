'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FilterSelect } from '@/components/ui/FilterSelect';
import {
  addLessonResource,
  createLesson,
  setLessonYoutube,
  updateLesson,
} from '@/lib/api/lessons';
import { getAuthToken } from '@/lib/api/client';
import { ApiRequestError } from '@/lib/api/types';
import { isLocalStudioId } from '@/lib/studio/id-utils';
import { mapApiLessonToStudio } from '@/lib/studio/lesson-utils';
import { toApiResourceType } from '@/lib/studio/resource-providers';
import { upsertStudioCourseLesson } from '@/lib/studio/session-course';
import { YoutubeLinkInput } from '@/components/studio/YoutubeLinkInput';
import { LessonResourceField, type LessonResourceInput } from '@/components/studio/LessonResourceField';
import { LessonStatusBadge } from '@/components/studio/StudioBadges';
import type { LessonStatus, StudioLesson } from '@/lib/studio/types';

type LessonEditorClientProps = {
  courseId: string;
  courseTitle: string;
  moduleTitle: string;
  lesson: StudioLesson;
};

export function LessonEditorClient({
  courseId,
  courseTitle,
  moduleTitle,
  lesson: initialLesson,
}: LessonEditorClientProps) {
  const [lesson, setLesson] = useState(initialLesson);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    upsertStudioCourseLesson(courseId, lesson, { courseTitle });
  }, [courseId, courseTitle, lesson]);

  const handleSaveLesson = async () => {
    const title = lesson.title.trim();
    if (!title) {
      setSaveError('Lesson title is required.');
      setSaveMessage(null);
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveMessage(null);

    const lessonToSave: StudioLesson = {
      ...lesson,
      title,
      description: lesson.description.trim(),
      materialsDescription: lesson.materialsDescription.trim(),
    };

    try {
      let persistedLesson = lessonToSave;
      const previousLessonId = lesson.id;
      const token = getAuthToken();
      const modulePersisted = !isLocalStudioId(lesson.moduleId);
      let syncedToApi = false;

      if (token && modulePersisted) {
        let detail;

        if (isLocalStudioId(lesson.id)) {
          detail = await createLesson(lesson.moduleId, {
            title: lessonToSave.title,
            description: lessonToSave.description || undefined,
            materialsDescription: lessonToSave.materialsDescription || undefined,
            sortOrder: lessonToSave.sortOrder,
          });

          if (lessonToSave.status !== 'DRAFT') {
            detail = await updateLesson(detail.id, {
              status: lessonToSave.status,
            });
          }
        } else {
          detail = await updateLesson(lesson.id, {
            title: lessonToSave.title,
            description: lessonToSave.description || undefined,
            materialsDescription: lessonToSave.materialsDescription || undefined,
            sortOrder: lessonToSave.sortOrder,
            status: lessonToSave.status,
          });
        }

        persistedLesson = mapApiLessonToStudio(detail);

        if (lessonToSave.youtubeUrl?.trim() && lessonToSave.youtubeVideoId) {
          detail = await setLessonYoutube(persistedLesson.id, {
            youtubeUrl: lessonToSave.youtubeUrl.trim(),
          });
          persistedLesson = mapApiLessonToStudio(detail);
        }

        const localResources = lessonToSave.resources.filter((resource) =>
          isLocalStudioId(resource.id),
        );

        for (const resource of localResources) {
          detail = await addLessonResource(persistedLesson.id, {
            title: resource.title,
            description: resource.description || undefined,
            url: resource.url || undefined,
            purchaseUrl: resource.purchaseUrl || undefined,
            accessMode: resource.accessMode,
            resourceType: toApiResourceType(resource.resourceType, resource.accessMode),
          });
        }

        if (localResources.length > 0 && detail) {
          persistedLesson = mapApiLessonToStudio(detail);
        }

        setLesson(persistedLesson);
        syncedToApi = true;
      }

      const savedLocally = upsertStudioCourseLesson(courseId, persistedLesson, {
        courseTitle,
        replaceLessonId: previousLessonId !== persistedLesson.id ? previousLessonId : undefined,
      });

      if (!savedLocally) {
        throw new Error('Could not save lesson locally. Return to the course builder and try again.');
      }

      if (syncedToApi) {
        setSaveMessage('Lesson saved.');
      } else if (token && !modulePersisted) {
        setSaveMessage('Lesson saved locally. Save the module first to sync to the server.');
      } else {
        setSaveMessage('Lesson saved locally.');
      }
    } catch (error) {
      setSaveError(
        error instanceof ApiRequestError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Could not save lesson.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const addResource = (resource: LessonResourceInput) => {
    setLesson((prev) => ({
      ...prev,
      resources: [
        ...prev.resources,
        {
          id: `res_${Math.random().toString(36).slice(2, 9)}`,
          title: resource.title,
          description: resource.description,
          resourceType: resource.resourceType,
          url: resource.url,
          purchaseUrl: resource.purchaseUrl,
          accessMode: resource.accessMode,
        },
      ],
    }));
  };

  const removeResource = (resourceId: string) => {
    setLesson((prev) => ({
      ...prev,
      resources: prev.resources.filter((resource) => resource.id !== resourceId),
    }));
  };

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/studio/courses/${courseId}/builder`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← {courseTitle}
        </Link>
        <p className="mt-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {moduleTitle}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Lesson editor
          </h1>
          <LessonStatusBadge status={lesson.status} />
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-border-subtle bg-surface p-6 shadow-soft">
            <h2 className="text-sm font-medium text-foreground">Lesson details</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="lesson-title" className="block text-xs font-medium text-muted-foreground">
                  Title
                </label>
                <input
                  id="lesson-title"
                  value={lesson.title}
                  onChange={(event) =>
                    setLesson((prev) => ({ ...prev, title: event.target.value }))
                  }
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none ring-ring focus:ring-2"
                />
              </div>
              <div>
                <label
                  htmlFor="lesson-description"
                  className="block text-xs font-medium text-muted-foreground"
                >
                  Description
                </label>
                <textarea
                  id="lesson-description"
                  rows={4}
                  value={lesson.description}
                  onChange={(event) =>
                    setLesson((prev) => ({ ...prev, description: event.target.value }))
                  }
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none ring-ring focus:ring-2"
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border-subtle bg-surface p-6 shadow-soft">
            <h2 className="text-sm font-medium text-foreground">YouTube video</h2>
            <YoutubeLinkInput
              className="mt-4"
              value={lesson.youtubeUrl ?? ''}
              onChange={(url) =>
                setLesson((prev) => ({ ...prev, youtubeUrl: url || null }))
              }
              onVideoIdChange={(videoId) =>
                setLesson((prev) => ({ ...prev, youtubeVideoId: videoId }))
              }
            />
          </section>

          <section className="rounded-2xl border border-border-subtle bg-surface p-6 shadow-soft">
            <LessonResourceField
              materialsDescription={lesson.materialsDescription}
              onMaterialsDescriptionChange={(value) =>
                setLesson((prev) => ({ ...prev, materialsDescription: value }))
              }
              resources={lesson.resources}
              onAdd={addResource}
              onRemove={removeResource}
            />
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
          <div className="rounded-2xl border border-border-subtle bg-surface p-5 shadow-soft">
            <h2 className="text-sm font-medium text-foreground">Visibility & status</h2>

            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="lesson-status" className="block text-xs font-medium text-muted-foreground">
                  Lesson status
                </label>
                <FilterSelect
                  id="lesson-status"
                  value={lesson.status}
                  onChange={(value) =>
                    setLesson((prev) => ({
                      ...prev,
                      status: value as LessonStatus,
                    }))
                  }
                  className="mt-1.5"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                </FilterSelect>
              </div>
            </div>

            {saveError && (
              <p className="mt-4 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
                {saveError}
              </p>
            )}
            {saveMessage && (
              <p className="mt-4 rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-sm text-accent">
                {saveMessage}
              </p>
            )}

            <button
              type="button"
              onClick={handleSaveLesson}
              disabled={isSaving}
              className="mt-6 w-full rounded-full bg-foreground py-2.5 text-sm font-medium text-background transition-opacity disabled:opacity-60"
            >
              {isSaving ? 'Saving…' : 'Save lesson'}
            </button>
          </div>

          <div className="rounded-2xl border border-border-subtle bg-surface-elevated p-5">
            <p className="text-xs text-muted-foreground">
              Status is included when you save. Save the parent module first if you want changes
              synced to the server.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
