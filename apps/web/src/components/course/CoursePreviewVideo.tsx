'use client';

import { YouTubeEmbed } from '@/components/player/YouTubeEmbed';
import { PreviewMaterialsList } from '@/components/course/PreviewMaterialsList';

type CoursePreviewVideoProps = {
  courseTitle: string;
  trailerYoutubeId?: string | null;
  previewMaterialsDescription?: string | null;
  emptyMessage?: string;
};

export function CoursePreviewVideo({
  courseTitle,
  trailerYoutubeId,
  previewMaterialsDescription,
  emptyMessage = 'No preview video yet. Add a preview video in the course builder.',
}: CoursePreviewVideoProps) {
  const hasVideo = Boolean(trailerYoutubeId?.trim());
  const hasMaterials = Boolean(previewMaterialsDescription?.trim());

  if (!hasVideo && !hasMaterials) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-2xl border border-dashed border-border bg-surface px-6 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {hasVideo ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface p-4">
          <YouTubeEmbed
            videoId={trailerYoutubeId!}
            title={`${courseTitle} — Preview`}
          />
        </div>
      ) : (
        <div className="flex aspect-video items-center justify-center rounded-2xl border border-dashed border-border bg-surface px-6 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      )}

      {hasMaterials && (
        <div className="rounded-xl border border-border bg-surface p-5">
          <h3 className="text-sm font-medium text-foreground">Materials list</h3>
          <div className="mt-3">
            <PreviewMaterialsList description={previewMaterialsDescription!} />
          </div>
        </div>
      )}
    </div>
  );
}
