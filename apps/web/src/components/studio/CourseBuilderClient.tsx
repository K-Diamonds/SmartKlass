'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { FilterSelect } from '@/components/ui/FilterSelect';
import { saveStudioCourse } from '@/lib/studio/session-course';
import { DeleteLessonModal } from '@/components/studio/DeleteLessonModal';
import { ArchiveCourseModal } from '@/components/studio/ArchiveCourseModal';
import {
  CourseActionsMenu,
  type CourseAction,
} from '@/components/studio/CourseActionsMenu';
import { LessonFormModal, type LessonFormValues } from '@/components/studio/LessonFormModal';
import { LessonRowActions } from '@/components/studio/LessonRowActions';
import { SortableList } from '@/components/studio/SortableList';
import { CertificateEnablementPanel } from '@/components/studio/CertificateEnablementPanel';
import { YoutubeLinkInput } from '@/components/studio/YoutubeLinkInput';
import { CourseStatusBadge, LessonStatusBadge } from '@/components/studio/StudioBadges';
import { createStudioLesson } from '@/lib/studio/lesson-utils';
import {
  ensureModulePersisted,
  persistNewLessonToApi,
} from '@/lib/studio/persist-lesson';
import { archiveCourse, publishCourse, updateCourse } from '@/lib/api/courses';
import { getAuthToken } from '@/lib/api/client';
import { ApiRequestError } from '@/lib/api/types';
import { isLocalStudioId } from '@/lib/studio/id-utils';
import {
  COURSE_DIFFICULTY_OPTIONS,
  difficultyLabelToApi,
  type CourseDifficulty,
} from '@/lib/studio/course-difficulty';
import { coursePreviewUrl } from '@/lib/courses';
import type { CourseStatus, StudioCourse, StudioLesson, StudioModule } from '@/lib/studio/types';
import { formatDuration } from '@/lib/utils';

type CourseBuilderClientProps = {
  course: StudioCourse;
};

function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export function CourseBuilderClient({ course: initialCourse }: CourseBuilderClientProps) {
  const [course, setCourse] = useState(initialCourse);
  const [status, setStatus] = useState<CourseStatus>(initialCourse.status);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [addLessonModuleId, setAddLessonModuleId] = useState<string | null>(null);
  const [isAddingLesson, setIsAddingLesson] = useState(false);
  const [lessonAddError, setLessonAddError] = useState<string | null>(null);
  const [lessonToDelete, setLessonToDelete] = useState<{
    moduleId: string;
    lesson: StudioLesson;
  } | null>(null);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  const modules = course.modules;

  const lessonCount = useMemo(
    () => modules.reduce((total, module) => total + module.lessons.length, 0),
    [modules],
  );

  const handleModuleReorder = (nextModules: StudioModule[]) => {
    setCourse((prev) => ({
      ...prev,
      modules: nextModules.map((module, index) => ({ ...module, sortOrder: index })),
    }));
  };

  const handleLessonReorder = (moduleId: string, nextLessons: StudioLesson[]) => {
    setCourse((prev) => ({
      ...prev,
      modules: prev.modules.map((module) =>
        module.id === moduleId
          ? {
              ...module,
              lessons: nextLessons.map((lesson, index) => ({ ...lesson, sortOrder: index })),
            }
          : module,
      ),
    }));
  };

  const addModule = () => {
    const newModule: StudioModule = {
      id: createId('mod'),
      courseId: course.id,
      title: 'Untitled module',
      description: '',
      sortOrder: modules.length,
      lessons: [],
    };

    setCourse((prev) => ({
      ...prev,
      modules: [...prev.modules, newModule],
    }));
  };

  const handleAddLesson = async (moduleId: string, values: LessonFormValues) => {
    const targetModule = modules.find((item) => item.id === moduleId);
    if (!targetModule) {
      return;
    }

    setIsAddingLesson(true);
    setLessonAddError(null);

    const draftLesson = createStudioLesson(moduleId, targetModule.lessons.length, values);

    try {
      const persistedModule = await ensureModulePersisted(course.id, targetModule);
      const persistedLesson = await persistNewLessonToApi({
        ...draftLesson,
        moduleId: persistedModule.id,
      });

      setCourse((prev) => ({
        ...prev,
        modules: prev.modules.map((item) => {
          if (item.id !== moduleId) {
            return item;
          }

          return {
            ...persistedModule,
            lessons: [...item.lessons, persistedLesson],
          };
        }),
      }));
      setAddLessonModuleId(null);
      setLessonAddError(null);
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.message
          : 'Could not save lesson to the server.';

      setCourse((prev) => ({
        ...prev,
        modules: prev.modules.map((item) =>
          item.id === moduleId
            ? { ...item, lessons: [...item.lessons, draftLesson] }
            : item,
        ),
      }));
      setLessonAddError(`Saved locally. ${message}`);
      setAddLessonModuleId(null);
    } finally {
      setIsAddingLesson(false);
    }
  };

  const handleDeleteLesson = (moduleId: string, lesson: StudioLesson) => {
    setCourse((prev) => ({
      ...prev,
      modules: prev.modules.map((module) =>
        module.id === moduleId
          ? {
              ...module,
              lessons: module.lessons
                .filter((item) => item.id !== lesson.id)
                .map((item, index) => ({ ...item, sortOrder: index })),
            }
          : module,
      ),
    }));
  };

  const applyStatusChange = async (
    nextStatus: CourseStatus,
    successMessage: string,
    errorLabel: string,
  ) => {
    setIsUpdatingStatus(true);
    setSaveMessage(null);
    setSaveError(null);

    const result = await persistDraft();

    if (!getAuthToken() || isLocalStudioId(course.id)) {
      setStatus(nextStatus);
      saveStudioCourse({ ...course, status: nextStatus });
      setSaveMessage(`${successMessage} (local only).`);
      setIsUpdatingStatus(false);
      return;
    }

    if (!result.ok) {
      setSaveError(`Could not save your latest changes. ${result.error}`);
      setIsUpdatingStatus(false);
      return;
    }

    try {
      if (nextStatus === 'PUBLISHED') {
        await publishCourse(course.id);
      } else if (nextStatus === 'ARCHIVED') {
        await archiveCourse(course.id);
      } else {
        await updateCourse(course.id, { status: 'DRAFT' });
      }

      setStatus(nextStatus);
      saveStudioCourse({ ...course, status: nextStatus });
      setSaveMessage(successMessage);
    } catch {
      setSaveError(`Could not complete “${errorLabel}”. Try again.`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleArchive = () => {
    if (status === 'PUBLISHED' && course.studentCount > 0) {
      setShowArchiveConfirm(true);
      return;
    }

    void applyStatusChange('ARCHIVED', 'Course archived.', 'Archive');
  };

  const handleCourseAction = (action: CourseAction) => {
    if (action === 'save_draft') {
      void handleSave();
      return;
    }

    if (action === 'publish') {
      void applyStatusChange('PUBLISHED', 'Course published.', 'Publish course');
      return;
    }

    handleArchive();
  };

  useEffect(() => {
    saveStudioCourse({ ...course, status });
  }, [course, status]);

  const handlePreview = () => {
    const courseToPreview = { ...course, status };
    saveStudioCourse(courseToPreview);
    window.open(coursePreviewUrl(course.id), '_blank', 'noopener,noreferrer');
  };

  const persistDraft = async (): Promise<{ ok: true } | { ok: false; error: string }> => {
    const courseToSave = { ...course, status };
    saveStudioCourse(courseToSave);

    if (!getAuthToken() || isLocalStudioId(course.id)) {
      return { ok: true };
    }

    try {
      await updateCourse(course.id, {
        trailerYoutubeId: course.trailerYoutubeId,
        previewMaterialsDescription: course.previewMaterialsDescription,
        estimatedHours: course.estimatedHours,
        difficultyLevel: difficultyLabelToApi(course.difficultyLevel),
      });
      return { ok: true };
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.message
          : 'Could not sync to the server.';
      return { ok: false, error: message };
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    setSaveError(null);

    const result = await persistDraft();

    if (!getAuthToken() || isLocalStudioId(course.id)) {
      setSaveMessage('Draft saved locally.');
    } else if (result.ok) {
      setSaveMessage('Draft saved.');
    } else {
      setSaveError(`Saved locally. ${result.error}`);
    }

    setIsSaving(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link
            href="/studio/courses"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            ← Courses
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {course.title}
            </h1>
            <CourseStatusBadge status={status} />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {modules.length} module{modules.length === 1 ? '' : 's'} · {lessonCount} lesson
            {lessonCount === 1 ? '' : 's'}
          </p>
        </div>

        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePreview}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-border-subtle"
            >
              Preview
            </button>
            <Link
              href={`/studio/courses/${course.id}/plans`}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-border-subtle"
            >
              Subscriber pricing
            </Link>
            <CourseActionsMenu
              status={status}
              disabled={isSaving}
              isBusy={isSaving || isUpdatingStatus}
              onAction={handleCourseAction}
            />
          </div>
          {saveError && (
            <p className="text-xs text-danger">{saveError}</p>
          )}
          {saveMessage && (
            <p className="text-xs text-accent">{saveMessage}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Students', value: course.studentCount.toLocaleString() },
          { label: 'Revenue', value: `$${(course.revenueCents / 100).toLocaleString()}` },
          { label: 'Rating', value: course.rating > 0 ? course.rating.toFixed(1) : '—' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border-subtle bg-surface px-4 py-3"
          >
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      <CertificateEnablementPanel
        courseId={course.id}
        offersCertificate={course.offersCertificate}
        certificatePaidAt={course.certificatePaidAt}
      />

      <section className="rounded-2xl border border-border-subtle bg-surface p-6 shadow-soft">
        <h2 className="text-sm font-medium text-foreground">Course details for visitors</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Shown on the course page before subscribe: total lessons update automatically as you
          build, but duration and difficulty are set by you.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="estimated-hours" className="block text-xs font-medium text-muted-foreground">
              Total course duration (hours)
            </label>
            <input
              id="estimated-hours"
              type="number"
              min={0}
              step={0.5}
              value={course.estimatedHours ?? ''}
              onChange={(event) => {
                const raw = event.target.value;
                const estimatedHours = raw === '' ? null : Number(raw);
                setCourse((prev) => ({
                  ...prev,
                  estimatedHours,
                }));
              }}
              placeholder="e.g. 6"
              className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none ring-ring focus:ring-2"
            />
          </div>
          <div>
            <label htmlFor="difficulty-level" className="block text-xs font-medium text-muted-foreground">
              Difficulty
            </label>
            <FilterSelect
              id="difficulty-level"
              value={course.difficultyLevel}
              onChange={(value) => {
                const difficultyLevel = value as CourseDifficulty;
                setCourse((prev) => ({
                  ...prev,
                  difficultyLevel,
                }));
              }}
              className="mt-1.5"
            >
              {COURSE_DIFFICULTY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.value}
                </option>
              ))}
            </FilterSelect>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Currently {lessonCount} lesson{lessonCount === 1 ? '' : 's'} in this course.
        </p>
      </section>

      <section className="rounded-2xl border border-border-subtle bg-surface p-6 shadow-soft">
        <h2 className="text-sm font-medium text-foreground">Preview video</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          This is the free video visitors see in &ldquo;Preview the course&rdquo; before they
          subscribe. It is separate from your lesson videos.
        </p>
        <YoutubeLinkInput
          className="mt-4"
          value={course.trailerYoutubeUrl ?? ''}
          onChange={(url) =>
            setCourse((prev) => ({
              ...prev,
              trailerYoutubeUrl: url || null,
            }))
          }
          onVideoIdChange={(videoId) => {
            setCourse((prev) => ({
              ...prev,
              trailerYoutubeId: videoId,
            }));
          }}
        />
        <div className="mt-6">
          <label
            htmlFor="preview-materials-description"
            className="block text-xs font-medium text-muted-foreground"
          >
            Materials list
          </label>
          <p className="mt-1 text-xs text-muted-foreground">
            Optional text shown below the preview video — ingredients, tools, downloads, or
            anything learners should know before subscribing. You can include links. One item per
            line works well. If nothing is needed, write &ldquo;No materials required.&rdquo; If you
            plan to send supplies to subscribers, note that with &ldquo;Materials included.&rdquo;
          </p>
          <textarea
            id="preview-materials-description"
            rows={6}
            value={course.previewMaterialsDescription ?? ''}
            onChange={(event) => {
              const value = event.target.value;
              setCourse((prev) => ({
                ...prev,
                previewMaterialsDescription: value.length > 0 ? value : null,
              }));
            }}
            placeholder={'No materials required\nMaterials included — shipped after you subscribe\nStand mixer\nRecipe PDF: https://example.com/recipe'}
            className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none ring-ring focus:ring-2"
          />
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {modules.length} module{modules.length === 1 ? '' : 's'} · {lessonCount} lesson
          {lessonCount === 1 ? '' : 's'} · Drag to reorder
        </p>
        {lessonAddError && (
          <p className="text-sm text-danger" role="alert">
            {lessonAddError}
          </p>
        )}

        <SortableList
          items={modules}
          onReorder={handleModuleReorder}
          renderItem={(module, _index, dragHandle) => (
          <div>
            <div className="flex items-center justify-between gap-3 px-5 py-4">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                {dragHandle}
                <div className="min-w-0">
                  <h2 className="truncate font-medium text-foreground">{module.title}</h2>
                  <p className="truncate text-xs text-muted-foreground">
                    {module.lessons.length} lessons
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href={`/studio/courses/${course.id}/modules/${module.id}`}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-border-subtle"
                >
                  Module settings
                </Link>
                <button
                  type="button"
                  onClick={() => setAddLessonModuleId(module.id)}
                  className="rounded-lg bg-border-subtle px-3 py-1.5 text-xs font-medium text-foreground hover:bg-border"
                >
                  + Lesson
                </button>
              </div>
            </div>

            {module.lessons.length > 0 ? (
              <div className="border-t border-border-subtle px-3 pb-3">
                <SortableList
                  items={module.lessons}
                  onReorder={(lessons) => handleLessonReorder(module.id, lessons)}
                  renderItem={(lesson, _lessonIndex, lessonHandle) => (
                    <div className="flex items-center justify-between gap-3 px-3 py-3">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        {lessonHandle}
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-sm text-foreground">
                              {lesson.title}
                            </span>
                            <LessonStatusBadge status={lesson.status} />
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {lesson.youtubeVideoId ? 'Video linked' : 'No video'}
                            {lesson.durationSeconds
                              ? ` · ${formatDuration(lesson.durationSeconds)}`
                              : ''}
                            {lesson.resources.length > 0
                              ? ` · ${lesson.resources.length} resource${lesson.resources.length === 1 ? '' : 's'}`
                              : ''}
                          </p>
                        </div>
                      </div>
                      <LessonRowActions
                        courseId={course.id}
                        lesson={lesson}
                        onDelete={(item) =>
                          setLessonToDelete({ moduleId: module.id, lesson: item })
                        }
                      />
                    </div>
                  )}
                />
              </div>
            ) : (
              <div className="border-t border-border-subtle px-5 py-6 text-center text-sm text-muted-foreground">
                No lessons yet. Add your first lesson or link a YouTube video.
              </div>
            )}
          </div>
          )}
        />

        <button
          type="button"
          onClick={addModule}
          className="w-full rounded-xl border border-dashed border-border py-5 text-sm font-medium text-muted-foreground transition-colors hover:border-accent hover:text-accent"
        >
          + Add module
        </button>
      </section>

      <LessonFormModal
        open={Boolean(addLessonModuleId)}
        onClose={() => {
          if (!isAddingLesson) {
            setAddLessonModuleId(null);
          }
        }}
        isSubmitting={isAddingLesson}
        error={lessonAddError}
        onSubmit={(values) => {
          if (addLessonModuleId) {
            void handleAddLesson(addLessonModuleId, values);
          }
        }}
      />
      <DeleteLessonModal
        lesson={lessonToDelete?.lesson ?? null}
        onClose={() => setLessonToDelete(null)}
        onConfirm={(lesson) => {
          if (lessonToDelete) {
            handleDeleteLesson(lessonToDelete.moduleId, lesson);
          }
        }}
      />
      <ArchiveCourseModal
        open={showArchiveConfirm}
        subscriberCount={course.studentCount}
        isSubmitting={isUpdatingStatus}
        onClose={() => {
          if (!isUpdatingStatus) {
            setShowArchiveConfirm(false);
          }
        }}
        onConfirm={() => {
          void applyStatusChange('ARCHIVED', 'Course archived.', 'Archive').then(() => {
            setShowArchiveConfirm(false);
          });
        }}
      />
    </div>
  );
}
