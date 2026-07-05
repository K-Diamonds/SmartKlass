'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { FilterSelect } from '@/components/ui/FilterSelect';
import { YoutubeLinkInput } from '@/components/studio/YoutubeLinkInput';
import { LessonResourceField } from '@/components/studio/LessonResourceField';
import type { LessonFormValues } from '@/lib/studio/lesson-utils';
import type { LessonStatus } from '@/lib/studio/types';

export type { LessonFormValues };

const emptyFormValues: LessonFormValues = {
  title: '',
  description: '',
  materialsDescription: '',
  status: 'DRAFT',
  youtubeUrl: null,
  youtubeVideoId: null,
  resources: [],
};

type LessonFormModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: LessonFormValues) => void;
  isSubmitting?: boolean;
  error?: string | null;
};

export function LessonFormModal({
  open,
  onClose,
  onSubmit,
  isSubmitting = false,
  error: externalError = null,
}: LessonFormModalProps) {
  const [values, setValues] = useState<LessonFormValues>(emptyFormValues);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setValues(emptyFormValues);
    setError(null);
  }, [open]);

  const removeResource = (resourceId: string) => {
    setValues((prev) => ({
      ...prev,
      resources: prev.resources.filter((resource) => resource.id !== resourceId),
    }));
  };

  const handleSubmit = () => {
    if (isSubmitting) {
      return;
    }

    const title = values.title.trim();
    if (!title) {
      setError('Lesson title is required.');
      return;
    }

    onSubmit({
      ...values,
      title,
      description: values.description.trim(),
      youtubeUrl: values.youtubeUrl?.trim() || null,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add lesson"
      description="Set up lesson details before adding it to this module."
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          {(error || externalError) && (
            <p className="flex-1 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger sm:mr-auto">
              {error ?? externalError}
            </p>
          )}
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-border-subtle disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background disabled:opacity-60"
          >
            {isSubmitting ? 'Adding…' : 'Add lesson'}
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <div>
          <label htmlFor="new-lesson-title" className="block text-xs font-medium text-muted-foreground">
            Title
          </label>
          <input
            id="new-lesson-title"
            value={values.title}
            onChange={(event) => setValues((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="e.g. Introduction to knife skills"
            className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none ring-ring focus:ring-2"
          />
        </div>

        <div>
          <label
            htmlFor="new-lesson-description"
            className="block text-xs font-medium text-muted-foreground"
          >
            Description
          </label>
          <textarea
            id="new-lesson-description"
            rows={4}
            value={values.description}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, description: event.target.value }))
            }
            placeholder="What will learners cover in this lesson?"
            className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none ring-ring focus:ring-2"
          />
        </div>

        <div>
          <h3 className="text-sm font-medium text-foreground">YouTube video</h3>
          <YoutubeLinkInput
            className="mt-3"
            value={values.youtubeUrl ?? ''}
            onChange={(url) =>
              setValues((prev) => ({ ...prev, youtubeUrl: url || null }))
            }
            onVideoIdChange={(videoId) =>
              setValues((prev) => ({ ...prev, youtubeVideoId: videoId }))
            }
          />
        </div>

        <div>
          <label htmlFor="new-lesson-status" className="block text-xs font-medium text-muted-foreground">
            Status
          </label>
          <FilterSelect
            id="new-lesson-status"
            value={values.status}
            onChange={(status) =>
              setValues((prev) => ({ ...prev, status: status as LessonStatus }))
            }
            className="mt-1.5"
          >
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
          </FilterSelect>
        </div>

        <LessonResourceField
          materialsDescription={values.materialsDescription}
          onMaterialsDescriptionChange={(value) =>
            setValues((prev) => ({ ...prev, materialsDescription: value }))
          }
          resources={values.resources}
          onAdd={(resource) =>
            setValues((prev) => ({
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
            }))
          }
          onRemove={removeResource}
        />
      </div>
    </Modal>
  );
}
