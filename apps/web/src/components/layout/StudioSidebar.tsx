'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { cn } from '@/lib/utils';

const studioLinks = [
  { href: '/studio', label: 'Dashboard', icon: '◈' },
  { href: '/studio/courses', label: 'Courses', icon: '▤' },
  { href: '/studio/subscribers', label: 'Subscribers', icon: '◎' },
  { href: '/studio/revenue', label: 'Revenue', icon: '◫' },
  { href: '/studio/reviews', label: 'Reviews', icon: '★' },
  { href: '/studio/settings', label: 'Settings', icon: '⚙' },
];

export function StudioSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/studio') {
      return pathname === '/studio';
    }
    return pathname.startsWith(href);
  };

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-border-subtle bg-sidebar">
      <div className="flex h-16 items-center justify-between border-b border-border-subtle px-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Creator Studio
          </p>
          <p className="text-sm font-semibold text-foreground">Your workspace</p>
        </div>
        <NotificationBell />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {studioLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              isActive(link.href)
                ? 'bg-accent-muted text-accent'
                : 'text-muted-foreground hover:bg-border-subtle hover:text-foreground',
            )}
          >
            <span className="text-base opacity-70">{link.icon}</span>
            {link.label}
          </Link>
        ))}

        <div className="pt-4">
          <Link
            href="/studio/courses/new"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-foreground px-3 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            + New course
          </Link>
        </div>
      </nav>

      <div className="border-t border-border-subtle p-4">
        <Link
          href="/dashboard"
          className="block text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Back to learning
        </Link>
      </div>
    </aside>
  );
}
