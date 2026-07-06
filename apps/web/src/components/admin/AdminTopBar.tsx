'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Circle } from 'lucide-react';
import { useAuthSession } from '@/hooks/useAuthSession';
import { formatAdminDate } from './admin-utils';

export function AdminTopBar() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuthSession();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const segment = pathname.replace('/admin', '').split('/').filter(Boolean);
  const breadcrumb =
    segment.length === 0
      ? 'Overview'
      : segment.map((s) => s.replace(/-/g, ' ')).join(' / ');

  return (
    <header className="sticky top-0 z-20 border-b border-white/8 bg-[#08080c]/90 backdrop-blur-xl">
      <div className="flex h-14 items-center justify-between gap-4 px-6 lg:px-10">
        <div className="flex min-w-0 items-center gap-3">
          <nav className="flex items-center gap-2 text-sm text-white/40">
            <Link href="/admin" className="hover:text-white/70">
              Ops
            </Link>
            <span>/</span>
            <span className="truncate capitalize text-white/80">{breadcrumb}</span>
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-4">
          <div className="hidden items-center gap-2 sm:flex">
            <Circle size={8} className="fill-emerald-400 text-emerald-400" />
            <span className="text-xs text-white/45">API live</span>
          </div>
          <span className="hidden text-xs text-white/30 md:inline">
            {formatAdminDate(now.toISOString())}
          </span>
          {isAuthenticated && (
            <span className="rounded-full border border-[#d4a853]/25 bg-[#d4a853]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#d4a853]">
              Staff
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
