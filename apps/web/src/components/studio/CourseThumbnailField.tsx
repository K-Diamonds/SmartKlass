'use client';

import { useEffect, useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { uploadCourseThumbnail } from '@/lib/api/courses';
import { ApiRequestError } from '@/lib/api/types';
import { cn } from '@/lib/utils';

type CourseThumbnailFieldProps = {
  thumbnailUrl: string | null;
  onThumbnailChange: (thumbnailUrl: string | null) => void;
  onError: (message: string | null) => void;
  disabled?: boolean;
};

const ACCEPTED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export function CourseThumbnailField({
  thumbnailUrl,
  onThumbnailChange,
  onError,
  disabled = false,
}: CourseThumbnailFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl);
      }
    };
  }, [localPreviewUrl]);

  const displayUrl = thumbnailUrl ?? localPreviewUrl;

  const uploadFile = async (file: File) => {
    if (!ACCEPTED_TYPES.has(file.type)) {
      onError('Thumbnail must be a JPEG, PNG, WebP, or GIF image.');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setLocalPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return previewUrl;
    });

    setIsUploading(true);
    onError(null);

    try {
      const url = await uploadCourseThumbnail(file);
      onThumbnailChange(url);
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.message
          : 'Could not upload thumbnail. Try again.';
      onError(message);
    } finally {
      setLocalPreviewUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }
        return null;
      });
      setIsUploading(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    await uploadFile(file);
  };

  const handleDrop = async (event: React.DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setIsDragging(false);

    if (disabled || isUploading) {
      return;
    }

    const file = event.dataTransfer.files?.[0];
    if (!file) {
      return;
    }

    await uploadFile(file);
  };

  const handleRemove = () => {
    if (localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl);
      setLocalPreviewUrl(null);
    }
    onThumbnailChange(null);
    onError(null);
  };

  const isBusy = disabled || isUploading;

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={isBusy}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!isBusy) {
            setIsDragging(true);
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!isBusy) {
            setIsDragging(true);
          }
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDrop={handleDrop}
        className={cn(
          'group relative flex h-40 w-full items-center justify-center overflow-hidden rounded-xl border border-dashed transition-colors',
          isDragging
            ? 'border-accent bg-accent-muted/40'
            : 'border-border hover:border-foreground/30 hover:bg-border-subtle/50',
          isBusy && 'cursor-not-allowed opacity-70',
        )}
      >
        {displayUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displayUrl}
              alt="Course thumbnail preview"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-dark/0 text-sm font-medium text-white transition-colors group-hover:bg-dark/45">
              <span className="opacity-0 transition-opacity group-hover:opacity-100">
                {isUploading ? 'Uploading…' : 'Change image'}
              </span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 px-4 text-center text-sm text-muted-foreground">
            <ImagePlus size={22} className="text-muted-foreground" />
            <span>{isUploading ? 'Uploading…' : 'Drop image or click to upload'}</span>
          </div>
        )}
      </button>

      {displayUrl && (
        <button
          type="button"
          disabled={isBusy}
          onClick={handleRemove}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
        >
          <X size={14} />
          Remove thumbnail
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={handleFileChange}
      />
    </div>
  );
}
