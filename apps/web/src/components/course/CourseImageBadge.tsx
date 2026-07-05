'use client';

import { Award } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

type CourseImageBadgeProps = {
  offersCertificate?: boolean;
  className?: string;
};

const badgeBaseClass =
  'absolute left-3 top-3 z-10 rounded-full px-2.5 py-1 text-[10px] font-semibold backdrop-blur-md';

export function CourseImageBadge({
  offersCertificate = false,
  className,
}: CourseImageBadgeProps) {
  const { t } = useTranslation();

  if (offersCertificate) {
    return (
      <span
        className={cn(
          badgeBaseClass,
          'flex items-center gap-1 bg-accent text-accent-foreground',
          className,
        )}
        title={t('course.certificateIncluded')}
      >
        <Award size={11} />
        {t('course.certificate')}
      </span>
    );
  }

  return (
    <span className={cn(badgeBaseClass, 'bg-black/35 text-white', className)}>
      {t('course.typeCourse')}
    </span>
  );
}
