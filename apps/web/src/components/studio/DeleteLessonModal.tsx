'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import type { StudioLesson } from '@/lib/studio/types';

type DeleteLessonModalProps = {
  lesson: StudioLesson | null;
  onClose: () => void;
  onConfirm: (lesson: StudioLesson) => void;
};

export function DeleteLessonModal({ lesson, onClose, onConfirm }: DeleteLessonModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!lesson) {
      return;
    }

    setConfirmText('');
    setError(null);
  }, [lesson]);

  if (!lesson) {
    return null;
  }

  const canDelete = confirmText === lesson.title;

  const handleDelete = () => {
    if (!canDelete) {
      setError(`Type "${lesson.title}" exactly to confirm deletion.`);
      return;
    }

    onConfirm(lesson);
    onClose();
  };

  return (
    <Modal
      open={Boolean(lesson)}
      onClose={onClose}
      title="Delete lesson"
      description="This removes the lesson from the module. This action cannot be undone."
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          {error && (
            <p className="flex-1 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger sm:mr-auto">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-border-subtle"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!canDelete}
            className="rounded-full bg-danger px-5 py-2.5 text-sm font-medium text-white transition-opacity disabled:opacity-50"
          >
            Delete lesson
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-foreground">
          You are about to delete{' '}
          <span className="font-medium">&ldquo;{lesson.title}&rdquo;</span>.
        </p>
        <div>
          <label htmlFor="delete-lesson-confirm" className="block text-xs font-medium text-muted-foreground">
            Type the lesson title to confirm
          </label>
          <input
            id="delete-lesson-confirm"
            value={confirmText}
            onChange={(event) => {
              setConfirmText(event.target.value);
              setError(null);
            }}
            placeholder={lesson.title}
            className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none ring-ring focus:ring-2"
          />
        </div>
      </div>
    </Modal>
  );
}
