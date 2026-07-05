import Link from 'next/link';
import type { StudioLesson } from '@/lib/studio/types';

type LessonRowActionsProps = {
  courseId: string;
  lesson: StudioLesson;
  onDelete: (lesson: StudioLesson) => void;
};

export function LessonRowActions({ courseId, lesson, onDelete }: LessonRowActionsProps) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <Link
        href={`/studio/courses/${courseId}/lessons/${lesson.id}`}
        className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-border-subtle"
      >
        Edit lesson
      </Link>
      <button
        type="button"
        onClick={() => onDelete(lesson)}
        className="rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/5"
      >
        Delete
      </button>
    </div>
  );
}
