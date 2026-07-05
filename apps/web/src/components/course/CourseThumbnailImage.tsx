'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

export const COURSE_THUMBNAIL_FALLBACK =
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&h=675&fit=crop';

function isUploadedThumbnail(url: string): boolean {
  return (
    url.includes('/uploads/') ||
    url.includes('localhost') ||
    url.includes('127.0.0.1')
  );
}

type CourseThumbnailImageProps = {
  src: string | null | undefined;
  alt: string;
  className?: string;
  priority?: boolean;
};

export function CourseThumbnailImage({
  src,
  alt,
  className,
  priority = false,
}: CourseThumbnailImageProps) {
  const [imageSrc, setImageSrc] = useState(src?.trim() || COURSE_THUMBNAIL_FALLBACK);

  useEffect(() => {
    setImageSrc(src?.trim() || COURSE_THUMBNAIL_FALLBACK);
  }, [src]);

  return (
    <Image
      src={imageSrc}
      alt={alt}
      fill
      priority={priority}
      unoptimized={isUploadedThumbnail(imageSrc)}
      onError={() => setImageSrc(COURSE_THUMBNAIL_FALLBACK)}
      className={className ?? 'object-cover'}
      sizes="(max-width: 1024px) 100vw, 50vw"
    />
  );
}
