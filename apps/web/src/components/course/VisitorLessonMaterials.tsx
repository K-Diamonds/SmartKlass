'use client';

import { ExternalLink, FileText, Lock, Play, ShoppingBag } from 'lucide-react';
import { YouTubeEmbed } from '@/components/player/YouTubeEmbed';
import type { LessonItem, ModuleItem } from '@/components/player/LessonPlayer';
import {
  getLessonMaterials,
  getMaterialTypeLabel,
  lessonHasCreatorMaterials,
  type LessonMaterialEntry,
} from '@/components/player/lesson-materials';
import { cn } from '@/lib/utils';

type VisitorLessonMaterialsProps = {
  modules: ModuleItem[];
  courseTitle: string;
  className?: string;
};

function flattenLessons(modules: ModuleItem[]): LessonItem[] {
  return modules.flatMap((module) => module.lessons);
}

function extractYoutubeVideoId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.slice(1) || null;
    }
    if (parsed.hostname.includes('youtube.com')) {
      if (parsed.pathname.startsWith('/embed/')) {
        return parsed.pathname.split('/')[2] ?? null;
      }
      return parsed.searchParams.get('v');
    }
  } catch {
    return null;
  }

  return null;
}

function VisitorMaterialItem({
  material,
  courseTitle,
  lessonTitle,
}: {
  material: LessonMaterialEntry;
  courseTitle: string;
  lessonTitle: string;
}) {
  if (material.kind === 'video') {
    const videoId = material.url ? extractYoutubeVideoId(material.url) : null;

    if (videoId) {
      return (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">{material.title}</p>
          {material.description && (
            <p className="text-sm leading-relaxed text-muted-foreground">{material.description}</p>
          )}
          <YouTubeEmbed
            videoId={videoId}
            title={`${courseTitle} — ${lessonTitle} — ${material.title}`}
          />
        </div>
      );
    }

    if (material.url) {
      return (
        <a
          href={material.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-3 rounded-xl border border-border-subtle px-4 py-3 transition-colors hover:bg-border-subtle"
        >
          <Play size={16} className="mt-0.5 shrink-0 text-accent" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-foreground">{material.title}</span>
            {material.description && (
              <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                {material.description}
              </span>
            )}
          </span>
          <ExternalLink size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
        </a>
      );
    }

    return (
      <div className="rounded-xl border border-border-subtle px-4 py-3">
        <p className="text-sm font-medium text-foreground">{material.title}</p>
        {material.description && (
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{material.description}</p>
        )}
      </div>
    );
  }

  if (material.kind === 'purchase') {
    return (
      <a
        href={material.purchaseUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-start gap-3 rounded-xl border border-border-subtle px-4 py-3 transition-colors hover:bg-border-subtle"
      >
        <ShoppingBag size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-foreground">{material.title}</span>
          {material.description && (
            <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
              {material.description}
            </span>
          )}
          <span className="mt-1 block text-xs text-accent">Purchase separately</span>
        </span>
        <ExternalLink size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
      </a>
    );
  }

  return (
    <a
      href={material.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-3 rounded-xl border border-border-subtle px-4 py-3 transition-colors hover:bg-border-subtle"
    >
      <FileText size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-foreground">{material.title}</span>
        {material.description && (
          <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
            {material.description}
          </span>
        )}
        <span className="mt-1 block text-xs text-muted-foreground">
          {getMaterialTypeLabel(material.resourceType, material.accessMode)}
        </span>
      </span>
      <ExternalLink size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
    </a>
  );
}

export function visitorCourseHasLessonMaterials(modules: ModuleItem[]): boolean {
  return flattenLessons(modules).some((lesson) => lessonHasCreatorMaterials(lesson));
}

export function VisitorLessonMaterials({
  modules,
  courseTitle,
  className,
}: VisitorLessonMaterialsProps) {
  const lessonsWithMaterials = flattenLessons(modules).filter((lesson) =>
    lessonHasCreatorMaterials(lesson),
  );

  if (lessonsWithMaterials.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
        Add lesson materials in the lesson editor to show text, videos, and links here.
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {lessonsWithMaterials.map((lesson) => {
        const materials = getLessonMaterials(lesson);

        return (
          <div
            key={lesson.id}
            className="space-y-4 rounded-xl border border-border-subtle bg-surface p-5"
          >
            <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Lock size={12} />
              Included with subscription
            </p>

            {lesson.materialsDescription?.trim() && (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {lesson.materialsDescription}
              </p>
            )}

            {materials.length > 0 && (
              <div className="space-y-3">
                {materials.map((material) => (
                  <VisitorMaterialItem
                    key={material.id}
                    material={material}
                    courseTitle={courseTitle}
                    lessonTitle={lesson.title}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
