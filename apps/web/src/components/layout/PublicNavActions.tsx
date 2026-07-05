'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { useAuthSession, getCreatorStudioLabel } from '@/hooks/useAuthSession';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { cn } from '@/lib/utils';

type PublicNavActionsProps = {
  variant?: 'dark' | 'light';
  layout?: 'desktop' | 'mobile';
  className?: string;
};

export function PublicNavActions({
  variant = 'light',
  layout = 'desktop',
  className,
}: PublicNavActionsProps) {
  const { t } = useTranslation();
  const { isAuthenticated, isCreator, creatorCourseCount, isLoading } = useAuthSession();
  const isDark = variant === 'dark';

  if (isLoading) {
    return (
      <div
        className={cn(layout === 'desktop' ? 'hidden h-10 lg:block' : 'h-10', className)}
        aria-hidden
      />
    );
  }

  const secondaryLinkClass = isDark
    ? 'px-4 py-2 text-sm text-white/60 transition-colors hover:text-white'
    : 'rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:px-4';

  const primaryLinkClass = isDark
    ? 'rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition-all duration-200 hover:scale-105 hover:opacity-90'
    : 'rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-all hover:opacity-90 sm:px-5 sm:py-2.5';

  if (!isAuthenticated) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 sm:gap-3',
          layout === 'desktop' && 'hidden lg:flex',
          className,
        )}
      >
        <Link href="/login" className={secondaryLinkClass}>
          {t('nav.signIn')}
        </Link>
        <Link href="/register" className={primaryLinkClass}>
          {t('nav.getStarted')}
        </Link>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 sm:gap-3',
        layout === 'desktop' && 'hidden lg:flex',
        layout === 'mobile' && 'w-full',
        className,
      )}
    >
      <Link href="/studio" className={secondaryLinkClass}>
        {getCreatorStudioLabel(
          { isCreator, creatorCourseCount },
          {
            becomeCreator: t('nav.becomeCreator'),
            openCreatorStudio: t('nav.openCreatorStudio'),
            creatorDashboard: t('nav.creatorDashboard'),
          },
        )}
      </Link>
      <Link
        href="/dashboard"
        className={cn(primaryLinkClass, layout === 'mobile' && 'ml-auto')}
      >
        {t('nav.dashboard')}
      </Link>
      <NotificationBell variant={variant} />
    </div>
  );
}
