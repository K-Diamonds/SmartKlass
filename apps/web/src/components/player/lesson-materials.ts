import { getResourceProviderLabel } from '@/lib/studio/resource-providers';
import { getMaterialAccessLabel } from '@/lib/studio/material-access';
import type { LessonItem } from '@/components/player/LessonPlayer';

export function getMaterialTypeLabel(resourceType: string, accessMode?: string): string {
  if (accessMode === 'VIDEO' || resourceType === 'VIDEO') {
    return 'Video';
  }

  if (accessMode === 'PURCHASE') {
    return 'Purchase';
  }

  switch (resourceType) {
    case 'PDF':
      return 'PDF';
    case 'WORKSHEET':
      return 'Worksheet';
    case 'CODE':
      return 'Code';
    case 'OTHER':
      return 'File';
    case 'GOOGLE_DRIVE':
    case 'DROPBOX':
    case 'LINK':
      return getResourceProviderLabel(resourceType);
    default:
      return resourceType.replace(/_/g, ' ').toLowerCase();
  }
}

export function lessonHasCreatorMaterials(lesson: LessonItem): boolean {
  return (
    Boolean(lesson.materialsDescription?.trim()) ||
    (lesson.resources?.length ?? 0) > 0
  );
}

export function lessonHasMaterials(lesson: LessonItem): boolean {
  return lessonHasCreatorMaterials(lesson);
}

export function getLessonMaterialCount(lesson: LessonItem): number {
  return getLessonMaterials(lesson).length;
}

export type LessonMaterialEntry =
  | {
      kind: 'video';
      id: string;
      label: string;
      title: string;
      description?: string;
      durationSeconds: number;
      accessMode: 'INCLUDED' | 'VIDEO';
      url?: string;
    }
  | {
      kind: 'resource';
      id: string;
      label: string;
      title: string;
      description?: string;
      url: string;
      purchaseUrl?: string;
      resourceType: string;
      accessMode: string;
    }
  | {
      kind: 'purchase';
      id: string;
      label: string;
      title: string;
      description?: string;
      purchaseUrl: string;
      resourceType: string;
      accessMode: 'PURCHASE';
    };

export function getLessonSupplementaryMaterials(lesson: LessonItem): LessonMaterialEntry[] {
  const materials: LessonMaterialEntry[] = [];

  for (const resource of lesson.resources ?? []) {
    const accessMode = resource.accessMode ?? 'INCLUDED';
    const description = resource.description?.trim() || undefined;

    if (accessMode === 'PURCHASE') {
      materials.push({
        kind: 'purchase',
        id: resource.id,
        label: getMaterialAccessLabel(accessMode),
        title: resource.title,
        description,
        purchaseUrl: resource.purchaseUrl || resource.url,
        resourceType: resource.resourceType,
        accessMode: 'PURCHASE',
      });
      continue;
    }

    if (accessMode === 'VIDEO') {
      materials.push({
        kind: 'video',
        id: resource.id,
        label: 'Video',
        title: resource.title,
        description,
        durationSeconds: 0,
        accessMode: 'VIDEO',
        url: resource.url,
      });
      continue;
    }

    materials.push({
      kind: 'resource',
      id: resource.id,
      label: getMaterialTypeLabel(resource.resourceType, accessMode),
      title: resource.title,
      description,
      url: resource.url,
      purchaseUrl: resource.purchaseUrl,
      resourceType: resource.resourceType,
      accessMode,
    });
  }

  return materials;
}

export function getLessonMaterials(lesson: LessonItem): LessonMaterialEntry[] {
  const materials = getLessonSupplementaryMaterials(lesson);

  if (lesson.youtubeVideoId) {
    materials.unshift({
      kind: 'video',
      id: `lesson-video-${lesson.id}`,
      label: 'Video',
      title: 'Video',
      durationSeconds: lesson.durationSeconds ?? 0,
      accessMode: 'INCLUDED',
    });
  }

  return materials;
}
