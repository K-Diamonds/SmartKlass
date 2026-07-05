'use client';

import { ChevronDown, ExternalLink, FileText, Lock, Play, ShoppingBag } from 'lucide-react';
import { cn, formatDuration } from '@/lib/utils';
import type { LessonItem } from '@/components/player/LessonPlayer';
import {
  getLessonMaterialCount,
  getLessonMaterials,
  type LessonMaterialEntry,
} from '@/components/player/lesson-materials';

type LessonAccordionListProps = {
  lessons: LessonItem[];
  activeLessonId: string;
  expandedLessonIds: Set<string>;
  isLessonLocked: (lesson: LessonItem) => boolean;
  onToggleLesson: (lesson: LessonItem) => void;
  onSelectLesson: (lesson: LessonItem) => void;
  className?: string;
};

function MaterialRow({
  material,
  locked,
  isActive,
  onSelectLesson,
}: {
  material: LessonMaterialEntry;
  locked: boolean;
  isActive: boolean;
  onSelectLesson: () => void;
}) {
  if (material.kind === 'purchase') {
    return (
      <a
        href={material.purchaseUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full items-start gap-3 bg-muted/20 px-4 py-2.5 pl-10 text-left text-sm transition-colors hover:bg-muted/45"
      >
        <ShoppingBag size={14} className="mt-0.5 shrink-0 opacity-70" />
        <span className="min-w-0 flex-1">
          <span className="block font-medium text-foreground">{material.title}</span>
          {material.description && (
            <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
              {material.description}
            </span>
          )}
          <span className="mt-1 block text-xs text-accent">Buy separately</span>
        </span>
        <ExternalLink size={12} className="mt-1 shrink-0 opacity-50" />
      </a>
    );
  }

  if (material.kind === 'video') {
    if (material.accessMode === 'VIDEO' && material.url && !locked) {
      return (
        <a
          href={material.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-start gap-3 bg-muted/20 px-4 py-2.5 pl-10 text-left text-sm transition-colors hover:bg-muted/45"
        >
          <Play size={14} className="mt-0.5 shrink-0 opacity-70" />
          <span className="min-w-0 flex-1">
            <span className="block font-medium text-foreground">{material.title}</span>
            {material.description && (
              <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                {material.description}
              </span>
            )}
            <span className="mt-1 block text-xs text-muted-foreground">Video resource</span>
          </span>
          <ExternalLink size={12} className="mt-1 shrink-0 opacity-50" />
        </a>
      );
    }

    if (locked) {
      return (
        <div className="flex w-full items-start gap-3 px-4 py-2.5 pl-10 text-left text-sm opacity-70">
          <Play size={14} className="mt-0.5 shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="block font-medium text-foreground">{material.title}</span>
            {material.description && (
              <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                {material.description}
              </span>
            )}
          </span>
          <Lock size={12} className="mt-1 shrink-0" />
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={onSelectLesson}
        className={cn(
          'flex w-full items-start gap-3 bg-muted/20 px-4 py-2.5 pl-10 text-left text-sm transition-colors hover:bg-muted/45',
          isActive && 'text-accent',
        )}
      >
        <Play size={14} className="mt-0.5 shrink-0 opacity-70" />
        <span className="min-w-0 flex-1">
          <span className="block font-medium text-foreground">{material.title}</span>
          {material.description && (
            <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
              {material.description}
            </span>
          )}
          {material.durationSeconds > 0 && (
            <span className="mt-1 block text-xs text-muted-foreground">
              {material.label} · {formatDuration(material.durationSeconds)}
            </span>
          )}
        </span>
      </button>
    );
  }

  if (locked) {
    return (
      <div className="flex w-full items-start gap-3 px-4 py-2.5 pl-10 text-left text-sm opacity-70">
        <FileText size={14} className="mt-0.5 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block font-medium text-foreground">{material.title}</span>
          {material.description && (
            <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
              {material.description}
            </span>
          )}
          <span className="mt-1 block text-xs text-muted-foreground">{material.label}</span>
        </span>
        <Lock size={12} className="mt-1 shrink-0" />
      </div>
    );
  }

  return (
    <a
      href={material.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onSelectLesson}
      className="flex w-full items-start gap-3 bg-muted/20 px-4 py-2.5 pl-10 text-left text-sm transition-colors hover:bg-muted/45"
    >
      <FileText size={14} className="mt-0.5 shrink-0 opacity-70" />
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-foreground">{material.title}</span>
        {material.description && (
          <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
            {material.description}
          </span>
        )}
        <span className="mt-1 block text-xs text-muted-foreground">{material.label}</span>
        {material.purchaseUrl && (
          <span className="mt-1 block text-xs text-muted-foreground">
            Also available to buy separately
          </span>
        )}
      </span>
      <ExternalLink size={12} className="mt-1 shrink-0 opacity-50" />
    </a>
  );
}

export function LessonAccordionList({
  lessons,
  activeLessonId,
  expandedLessonIds,
  isLessonLocked,
  onToggleLesson,
  onSelectLesson,
  className,
}: LessonAccordionListProps) {
  return (
    <ul className={cn('bg-surface', className)}>
      {lessons.map((lesson, lessonIndex) => {
        const locked = isLessonLocked(lesson);
        const isExpanded = expandedLessonIds.has(lesson.id);
        const isActive = activeLessonId === lesson.id;
        const materials = getLessonMaterials(lesson);
        const materialCount = getLessonMaterialCount(lesson);

        return (
          <li
            key={lesson.id}
            className={cn(lessonIndex > 0 && 'border-t border-border-subtle')}
          >
            <button
              type="button"
              onClick={() => onToggleLesson(lesson)}
              className={cn(
                'flex w-full items-center gap-2 border-l-[3px] px-4 py-3 text-left text-sm transition-colors',
                isActive && !locked
                  ? 'border-l-accent bg-accent-muted text-accent'
                  : 'border-l-transparent bg-surface text-foreground hover:bg-muted/50',
              )}
            >
              <ChevronDown
                size={16}
                className={cn(
                  'shrink-0 transition-transform',
                  isActive && !locked ? 'text-accent' : 'text-muted-foreground',
                  isExpanded ? 'rotate-0' : '-rotate-90',
                )}
              />
              <span
                className={cn(
                  'min-w-0 flex-1 font-medium',
                  isActive && !locked ? 'text-accent' : 'text-foreground',
                )}
              >
                {lesson.title}
              </span>
              {locked && <Lock size={14} className="shrink-0 text-muted-foreground" />}
              {materialCount > 0 && (
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium',
                    isActive && !locked
                      ? 'bg-accent/15 text-accent'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {materialCount}
                </span>
              )}
            </button>

            {isExpanded && (
              <div className="border-t border-border-subtle bg-muted/35 pb-2">
                {materials.length > 0 ? (
                  <ul>
                    {materials.map((material) => (
                      <li key={material.id}>
                        <MaterialRow
                          material={material}
                          locked={locked && material.kind !== 'purchase'}
                          isActive={isActive}
                          onSelectLesson={() => onSelectLesson(lesson)}
                        />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-4 py-3 pl-10 text-xs text-muted-foreground">
                    No materials added yet.
                  </p>
                )}

                {locked && (
                  <p className="px-4 pb-1 pl-10 text-xs font-medium text-muted-foreground">
                    Subscribe to unlock this lesson
                  </p>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
