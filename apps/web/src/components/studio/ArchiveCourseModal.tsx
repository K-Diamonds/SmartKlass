'use client';

import { Modal } from '@/components/ui/Modal';

type ArchiveCourseModalProps = {
  open: boolean;
  subscriberCount: number;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function ArchiveCourseModal({
  open,
  subscriberCount,
  isSubmitting,
  onClose,
  onConfirm,
}: ArchiveCourseModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Archive this course?"
      description="This course will no longer accept new subscribers."
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
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
            onClick={onConfirm}
            disabled={isSubmitting}
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {isSubmitting ? 'Archiving…' : 'Archive course'}
          </button>
        </div>
      }
    >
      <div className="space-y-4 text-sm text-foreground">
        <p>
          The course will be removed from public listings and new learners will not be able to
          subscribe.
        </p>
        <p>
          {subscriberCount === 1 ? (
            <>
              Your <span className="font-medium">1 active subscriber</span> will keep access until
              their subscription or membership for this course ends.
            </>
          ) : (
            <>
              Your{' '}
              <span className="font-medium">
                {subscriberCount.toLocaleString()} active subscribers
              </span>{' '}
              will keep access until their subscription or membership for this course ends.
            </>
          )}
        </p>
        <p className="text-muted-foreground">
          The course will stay archived until you publish it again from Actions.
        </p>
      </div>
    </Modal>
  );
}
