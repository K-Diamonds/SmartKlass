'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ExternalLink, FileText, Lock, Play, ShoppingBag } from 'lucide-react';
import { LessonAccordionList } from '@/components/player/LessonAccordionList';
import {
  getLessonSupplementaryMaterials,
  getMaterialTypeLabel,
  lessonHasCreatorMaterials,
} from '@/components/player/lesson-materials';
import { YouTubeEmbed } from './YouTubeEmbed';
import { cn, formatDuration } from '@/lib/utils';

export type LessonResourceItem = {
  id: string;
  title: string;
  description?: string;
  resourceType: string;
  url: string;
  purchaseUrl?: string;
  accessMode?: string;
};

export type LessonItem = {
  id: string;
  title: string;
  description?: string;
  materialsDescription?: string;
  durationSeconds: number;
  isPreview: boolean;
  youtubeVideoId: string;
  resources?: LessonResourceItem[];
};

export type ModuleItem = {
  id: string;
  title: string;
  description?: string;
  lessons: LessonItem[];
};

type LessonPlayerProps = {
  courseTitle: string;
  modules: ModuleItem[];
  className?: string;
  subscriberAccess?: boolean;
};

function flattenLessons(modules: ModuleItem[]): LessonItem[] {
  return modules.flatMap((module) => module.lessons);
}

function findFirstLesson(modules: ModuleItem[]) {
  return flattenLessons(modules)[0];
}

export function LessonPlayer({
  courseTitle,
  modules,
  className,
  subscriberAccess = true,
}: LessonPlayerProps) {
  const multipleModules = modules.length > 1;
  const allLessons = useMemo(() => flattenLessons(modules), [modules]);
  const firstLesson = useMemo(() => findFirstLesson(modules), [modules]);
  const [activeLessonId, setActiveLessonId] = useState(firstLesson?.id ?? '');
  const [expandedLessonIds, setExpandedLessonIds] = useState<Set<string>>(new Set());
  const [expandedModuleIds, setExpandedModuleIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setActiveLessonId(firstLesson?.id ?? '');
    if (firstLesson?.id) {
      setExpandedLessonIds(new Set([firstLesson.id]));
    }
  }, [firstLesson?.id, subscriberAccess]);

  useEffect(() => {
    if (modules.length === 0) {
      setExpandedModuleIds(new Set());
      return;
    }

    if (!multipleModules) {
      setExpandedModuleIds(new Set([modules[0].id]));
      return;
    }

    const moduleWithActiveLesson = modules.find((module) =>
      module.lessons.some((lesson) => lesson.id === activeLessonId),
    );

    if (moduleWithActiveLesson) {
      setExpandedModuleIds(new Set([moduleWithActiveLesson.id]));
    }
  }, [modules, multipleModules, activeLessonId]);

  const activeLesson =
    allLessons.find((lesson) => lesson.id === activeLessonId) ?? firstLesson;

  const isLessonLocked = () => !subscriberAccess;

  const handleLessonSelect = (lesson: LessonItem) => {
    if (isLessonLocked(lesson)) {
      return;
    }

    setActiveLessonId(lesson.id);
    setExpandedLessonIds((current) => new Set(current).add(lesson.id));

    if (multipleModules) {
      const parentModule = modules.find((module) =>
        module.lessons.some((item) => item.id === lesson.id),
      );

      if (parentModule) {
        setExpandedModuleIds((current) => new Set(current).add(parentModule.id));
      }
    }
  };

  const handleToggleLesson = (lesson: LessonItem) => {
    setExpandedLessonIds((current) => {
      const next = new Set(current);
      if (next.has(lesson.id)) {
        next.delete(lesson.id);
      } else {
        next.add(lesson.id);
      }
      return next;
    });

    if (!isLessonLocked(lesson)) {
      setActiveLessonId(lesson.id);
    }
  };

  const handleToggleModule = (moduleId: string) => {
    setExpandedModuleIds((current) => {
      const next = new Set(current);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  const activeMaterials = activeLesson ? getLessonSupplementaryMaterials(activeLesson) : [];

  return (
    <div className={cn('flex flex-col gap-6 lg:flex-row', className)}>
      <div className="flex-1 space-y-4">
        {activeLesson ? (
          <>
            {isLessonLocked(activeLesson) ? (
              <div className="flex aspect-video flex-col items-center justify-center gap-3 rounded-xl border border-border-subtle bg-surface px-6 text-center">
                <Lock size={28} className="text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">Subscribe to unlock this lesson</p>
              </div>
            ) : activeLesson.youtubeVideoId ? (
              <YouTubeEmbed
                videoId={activeLesson.youtubeVideoId}
                title={`${courseTitle} — ${activeLesson.title}`}
              />
            ) : (
              <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-border bg-surface text-sm text-muted-foreground">
                No video linked for this lesson yet
              </div>
            )}
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                {activeLesson.title}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {isLessonLocked(activeLesson) && (
                  <span className="inline-block rounded-full bg-border-subtle px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                    Subscribe to unlock
                  </span>
                )}
              </div>
              {activeLesson.description?.trim() && (
                <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {activeLesson.description}
                </p>
              )}
              {lessonHasCreatorMaterials(activeLesson) && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-foreground">Lesson materials</h3>
                  {activeLesson.materialsDescription?.trim() && (
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                      {activeLesson.materialsDescription}
                    </p>
                  )}
                  {activeMaterials.length > 0 && (
                    <ul className={cn('space-y-2', activeLesson.materialsDescription?.trim() && 'mt-3')}>
                      {activeMaterials.map((material) =>
                        material.kind === 'video' ? (
                          <li
                            key={material.id}
                            className="flex items-start gap-3 rounded-xl border border-border-subtle px-4 py-3"
                          >
                            <Play size={16} className="mt-0.5 shrink-0 text-accent" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-foreground">{material.title}</p>
                              {material.description && (
                                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                  {material.description}
                                </p>
                              )}
                              {material.durationSeconds > 0 && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {formatDuration(material.durationSeconds)}
                                </p>
                              )}
                              {material.url && (
                                <a
                                  href={material.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                                >
                                  Open video
                                  <ExternalLink size={12} />
                                </a>
                              )}
                            </div>
                          </li>
                        ) : material.kind === 'purchase' ? (
                          <li key={material.id}>
                            <a
                              href={material.purchaseUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-start gap-3 rounded-xl border border-border-subtle px-4 py-3 transition-colors hover:bg-border-subtle"
                            >
                              <ShoppingBag size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-foreground">{material.title}</p>
                                {material.description && (
                                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                    {material.description}
                                  </p>
                                )}
                                <p className="mt-1 text-xs text-accent">Purchase separately</p>
                              </div>
                              <ExternalLink size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
                            </a>
                          </li>
                        ) : (
                          <li key={material.id}>
                            <a
                              href={material.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-start gap-3 rounded-xl border border-border-subtle px-4 py-3 transition-colors hover:bg-border-subtle"
                            >
                              <FileText size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-foreground">{material.title}</p>
                                {material.description && (
                                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                    {material.description}
                                  </p>
                                )}
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {getMaterialTypeLabel(material.resourceType, material.accessMode)}
                                </p>
                                {material.purchaseUrl && (
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    Optional purchase link available
                                  </p>
                                )}
                              </div>
                              <ExternalLink size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
                            </a>
                          </li>
                        ),
                      )}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex aspect-video items-center justify-center rounded-xl border border-border-subtle bg-surface text-muted-foreground">
            Select a lesson to begin
          </div>
        )}
      </div>

      <aside className="w-full shrink-0 lg:w-80">
        <div className="border border-border-subtle bg-surface">
          <div className="max-h-[520px] overflow-y-auto">
            <div className="border-b border-border-subtle bg-muted/40 px-4 py-3">
              <h3 className="text-sm font-semibold text-foreground">Course content</h3>
            </div>
            {modules.map((module) => {
              const isModuleExpanded = expandedModuleIds.has(module.id);

              return (
                <div key={module.id} className="border-b border-border-subtle last:border-b-0">
                  {multipleModules ? (
                    <button
                      type="button"
                      onClick={() => handleToggleModule(module.id)}
                      className="flex w-full items-center gap-3 bg-accent px-4 py-3 text-left text-white transition-colors hover:opacity-95"
                    >
                      <ChevronDown
                        size={16}
                        className={cn(
                          'shrink-0 text-white transition-transform',
                          isModuleExpanded ? 'rotate-0' : '-rotate-90',
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white">{module.title}</p>
                        <p className="text-xs text-white/80">
                          {module.lessons.length} lesson
                          {module.lessons.length === 1 ? '' : 's'}
                        </p>
                      </div>
                    </button>
                  ) : (
                    <div className="bg-accent px-4 py-3">
                      <p className="text-sm font-semibold text-white">{module.title}</p>
                      <p className="text-xs text-white/80">
                        {module.lessons.length} lesson
                        {module.lessons.length === 1 ? '' : 's'}
                      </p>
                    </div>
                  )}

                  {isModuleExpanded && (
                    <LessonAccordionList
                      className="ml-3 border-l border-border-subtle"
                      lessons={module.lessons}
                      activeLessonId={activeLessonId}
                      expandedLessonIds={expandedLessonIds}
                      isLessonLocked={isLessonLocked}
                      onToggleLesson={handleToggleLesson}
                      onSelectLesson={handleLessonSelect}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </aside>
    </div>
  );
}
