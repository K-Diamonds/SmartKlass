'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { APP_NAME } from '@smartklass/shared';
import { useAuthSession, getCreatorStudioLabel } from '@/hooks/useAuthSession';
import { cn } from '@/lib/utils';

const mainLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: '◈' },
  { href: '/library', label: 'Library', icon: '▤' },
  { href: '/subscriptions', label: 'Subscriptions', icon: '↻' },
  { href: '/favorites', label: 'Favorites', icon: '♡' },
];

const settingsLinks = [
  { href: '/settings/profile', label: 'Profile' },
  { href: '/settings/billing', label: 'Billing' },
];

export function DashboardSidebar() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const { isCreator, creatorCourseCount, isLoading } = useAuthSession();

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-border-subtle bg-sidebar">
      <div className="flex h-16 items-center gap-2 border-b border-border-subtle px-5">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-xs font-bold text-accent-foreground">
            S
          </span>
          <span className="text-sm">{APP_NAME}</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto p-4">
        <div className="space-y-1">
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Learning
          </p>
          {mainLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                pathname === link.href
                  ? 'bg-accent-muted text-accent'
                  : 'text-muted-foreground hover:bg-border-subtle hover:text-foreground',
              )}
            >
              <span className="text-base opacity-70">{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </div>

        <div className="space-y-1">
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Settings
          </p>
          {settingsLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                pathname === link.href
                  ? 'bg-accent-muted text-accent'
                  : 'text-muted-foreground hover:bg-border-subtle hover:text-foreground',
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </nav>

      <div className="border-t border-border-subtle p-4">
        <Link
          href="/studio"
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-border-subtle"
        >
          {isLoading
            ? '…'
            : getCreatorStudioLabel(
                { isCreator, creatorCourseCount },
                {
                  becomeCreator: t('nav.becomeCreator'),
                  openCreatorStudio: t('nav.openCreatorStudio'),
                  creatorDashboard: t('nav.creatorDashboard'),
                },
              )}
        </Link>
      </div>
    </aside>
  );
}
