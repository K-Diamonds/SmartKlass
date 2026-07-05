'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createCourseModule, updateCourseModule } from '@/lib/api/modules';
import { getAuthToken } from '@/lib/api/client';
import { ApiRequestError } from '@/lib/api/types';
import { isLocalStudioId } from '@/lib/studio/id-utils';
import { upsertStudioCourseModule } from '@/lib/studio/session-course';
import { SortableList } from '@/components/studio/SortableList';
import { DeleteLessonModal } from '@/components/studio/DeleteLessonModal';
import { LessonFormModal, type LessonFormValues } from '@/components/studio/LessonFormModal';
import { LessonRowActions } from '@/components/studio/LessonRowActions';
import { LessonStatusBadge } from '@/components/studio/StudioBadges';
import { createStudioLesson } from '@/lib/studio/lesson-utils';
import {
  ensureModulePersisted,
  persistNewLessonToApi,
} from '@/lib/studio/persist-lesson';
import type { StudioLesson, StudioModule } from '@/lib/studio/types';
import { formatDuration } from '@/lib/utils';

type ModuleBuilderClientProps = {
  courseId: string;
  courseTitle: string;
  module: StudioModule;
};

export function ModuleBuilderClient({
  courseId,
  courseTitle,
  module: initialModule,
}: ModuleBuilderClientProps) {
  const [module, setModule] = useState(initialModule);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [isAddingLesson, setIsAddingLesson] = useState(false);
  const [lessonAddError, setLessonAddError] = useState<string | null>(null);
  const [lessonToDelete, setLessonToDelete] = useState<StudioLesson | null>(null);

  useEffect(() => {
    upsertStudioCourseModule(courseId, module, { courseTitle });
  }, [courseId, courseTitle, module]);

  const handleSaveModule = async () => {
    const title = module.title.trim();
    if (!title) {
      setSaveError('Module title is required.');
      setSaveMessage(null);
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveMessage(null);

    const moduleToSave = {
      ...module,
      title,
      description: module.description.trim(),
    };

    try {
      let persistedModule = moduleToSave;
      const previousModuleId = module.id;
      const token = getAuthToken();

      if (token) {
        if (isLocalStudioId(module.id)) {
          const created = await createCourseModule(courseId, {
            title: moduleToSave.title,
            description: moduleToSave.description || undefined,
            sortOrder: moduleToSave.sortOrder,
          });

          persistedModule = {
            ...moduleToSave,
            id: created.id,
            courseId: created.courseId,
          };
          setModule(persistedModule);
        } else {
          await updateCourseModule(module.id, {
            title: moduleToSave.title,
            description: moduleToSave.description || undefined,
            sortOrder: moduleToSave.sortOrder,
          });
        }
      }

      const savedLocally = upsertStudioCourseModule(courseId, persistedModule, {
        courseTitle,
        replaceModuleId: previousModuleId !== persistedModule.id ? previousModuleId : undefined,
      });

      if (!savedLocally) {
        throw new Error('Could not save module locally. Return to the course builder and try again.');
      }

      setSaveMessage(token ? 'Module saved.' : 'Module saved locally.');
    } catch (error) {
      setSaveError(
        error instanceof ApiRequestError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Could not save module.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleLessonReorder = (lessons: StudioLesson[]) => {
    setModule((prev) => ({
      ...prev,
      lessons: lessons.map((lesson, index) => ({ ...lesson, sortOrder: index })),
    }));
  };

  const handleAddLesson = async (values: LessonFormValues) => {
    setIsAddingLesson(true);
    setLessonAddError(null);

    const draftLesson = createStudioLesson(module.id, module.lessons.length, values);

    try {
      const persistedModule = await ensureModulePersisted(courseId, module);
      if (persistedModule.id !== module.id) {
        setModule(persistedModule);
      }

      const persistedLesson = await persistNewLessonToApi({
        ...draftLesson,
        moduleId: persistedModule.id,
      });

      const nextModule = {
        ...persistedModule,
        lessons: [...module.lessons, persistedLesson],
      };

      setModule(nextModule);
      upsertStudioCourseModule(courseId, nextModule, {
        courseTitle,
        replaceModuleId: module.id !== persistedModule.id ? module.id : undefined,
      });
      setIsLessonModalOpen(false);
    } catch (error) {
      const message =
        error instanceof ApiRequestError
          ? error.message
          : 'Could not save lesson to the server.';

      setModule((prev) => ({
        ...prev,
        lessons: [...prev.lessons, draftLesson],
      }));
      setLessonAddError(`Saved locally. ${message}`);
      setIsLessonModalOpen(false);
    } finally {
      setIsAddingLesson(false);
    }
  };

  const handleDeleteLesson = (lesson: StudioLesson) => {
    setModule((prev) => ({
      ...prev,
      lessons: prev.lessons
        .filter((item) => item.id !== lesson.id)
        .map((item, index) => ({ ...item, sortOrder: index })),
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
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Module builder
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Organize lessons and set module-level details
        </p>
      </div>

      <div className="rounded-2xl border border-border-subtle bg-surface p-6 shadow-soft">
        <h2 className="text-sm font-medium text-foreground">Module details</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="module-title" className="block text-xs font-medium text-muted-foreground">
              Title
            </label>
            <input
              id="module-title"
              value={module.title}
              onChange={(event) =>
                setModule((prev) => ({ ...prev, title: event.target.value }))
              }
              className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none ring-ring focus:ring-2"
            />
          </div>
          <div className="sm:col-span-2">
            <label
              htmlFor="module-description"
              className="block text-xs font-medium text-muted-foreground"
            >
              Description
            </label>
            <textarea
              id="module-description"
              rows={3}
              value={module.description}
              onChange={(event) =>
                setModule((prev) => ({ ...prev, description: event.target.value }))
              }
              className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none ring-ring focus:ring-2"
            />
          </div>
        </div>
        <div className="mt-6 flex flex-col items-end gap-2">
          {saveError && (
            <p className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
              {saveError}
            </p>
          )}
          {saveMessage && (
            <p className="rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-sm text-accent">
              {saveMessage}
            </p>
          )}
          <button
            type="button"
            onClick={handleSaveModule}
            disabled={isSaving}
            className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity disabled:opacity-60"
          >
            {isSaving ? 'Saving…' : 'Save module'}
          </button>
        </div>
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Lessons</h2>
          <button
            type="button"
            onClick={() => setIsLessonModalOpen(true)}
            className="rounded-lg bg-border-subtle px-3 py-1.5 text-xs font-medium text-foreground hover:bg-border"
          >
            + Add lesson
          </button>
        </div>

        {module.lessons.length > 0 ? (
          <SortableList
            items={module.lessons}
            onReorder={handleLessonReorder}
            renderItem={(lesson, _index, dragHandle) => (
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  {dragHandle}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-medium text-foreground">
                        {lesson.title}
                      </span>
                      <LessonStatusBadge status={lesson.status} />
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {lesson.youtubeVideoId ? 'YouTube linked' : 'No video'}
                      {lesson.durationSeconds
                        ? ` · ${formatDuration(lesson.durationSeconds)}`
                        : ''}
                    </p>
                  </div>
                </div>
                <LessonRowActions
                  courseId={courseId}
                  lesson={lesson}
                  onDelete={setLessonToDelete}
                />
              </div>
            )}
          />
        ) : (
          <div className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
            Drag lessons here after adding them, or create your first lesson.
          </div>
        )}
      </div>

      <LessonFormModal
        open={isLessonModalOpen}
        onClose={() => {
          if (!isAddingLesson) {
            setIsLessonModalOpen(false);
            setLessonAddError(null);
          }
        }}
        isSubmitting={isAddingLesson}
        error={lessonAddError}
        onSubmit={(values) => {
          void handleAddLesson(values);
        }}
      />
      <DeleteLessonModal
        lesson={lessonToDelete}
        onClose={() => setLessonToDelete(null)}
        onConfirm={handleDeleteLesson}
      />
    </div>
  );
}
