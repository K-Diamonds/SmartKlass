'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { BookOpen } from 'lucide-react';
import { APP_NAME } from '@smartklass/shared';
import { CatalogNav } from '@/components/catalog/CatalogNav';
import { PublicNavActions } from '@/components/layout/PublicNavActions';

export function PublicNavbar() {
  const pathname = usePathname();
  const isHome = pathname === '/';

  if (isHome) {
    return null;
  }

  return (
    <header className="glass-nav-light sticky top-0 z-50 overflow-visible border-b border-border">
      <div className="mx-auto flex h-auto min-h-16 max-w-7xl flex-col gap-3 overflow-visible px-6 py-3 lg:h-16 lg:flex-row lg:items-center lg:gap-6 lg:px-10 lg:py-0">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent">
              <BookOpen size={15} className="text-accent-foreground" />
            </div>
            <span className="font-display text-lg font-semibold tracking-tight text-foreground">
              {APP_NAME}
            </span>
          </Link>

          <PublicNavActions layout="mobile" className="lg:hidden" />
        </div>

        <Suspense fallback={null}>
          <CatalogNav className="min-w-0 flex-1 justify-center lg:justify-center" />
        </Suspense>

        <PublicNavActions layout="desktop" />
      </div>
    </header>
  );
}
