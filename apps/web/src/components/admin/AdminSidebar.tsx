'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  Flag,
  GitCompare,
  LayoutDashboard,
  Receipt,
  Scale,
  Shield,
  ToggleLeft,
  Users,
  Webhook,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const adminLinks = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/admin/creators', label: 'Creators', icon: Users },
  { href: '/admin/transactions', label: 'Transactions', icon: Receipt },
  { href: '/admin/refunds', label: 'Refunds', icon: Wallet },
  { href: '/admin/disputes', label: 'Disputes', icon: Scale },
  { href: '/admin/payouts', label: 'Payouts', icon: Activity },
  { href: '/admin/reconciliation', label: 'Reconciliation', icon: GitCompare },
  { href: '/admin/webhooks', label: 'Webhooks', icon: Webhook },
  { href: '/admin/feature-flags', label: 'Flags & Rules', icon: ToggleLeft },
  { href: '/admin/audit-logs', label: 'Audit logs', icon: Shield },
];

export function AdminSidebar() {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-white/8 bg-[#0a0a10]">
      <div className="border-b border-white/8 px-5 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#d4a853]/15 ring-1 ring-[#d4a853]/30">
            <Shield size={16} className="text-[#d4a853]" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d4a853]">
              SmartKlass
            </p>
            <p className="text-sm font-semibold text-white">Ops Command</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {adminLinks.map((link) => {
          const Icon = link.icon;
          const active = isActive(link.href, link.exact);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-white/8 text-white'
                  : 'text-white/45 hover:bg-white/5 hover:text-white/80',
              )}
            >
              <Icon size={16} className={active ? 'text-[#d4a853]' : 'opacity-60'} />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/8 p-4">
        <div className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2">
          <Flag size={14} className="text-amber-400" />
          <p className="text-xs text-white/45">Staff session · actions audited</p>
        </div>
        <Link
          href="/dashboard"
          className="mt-3 block text-center text-xs text-white/35 transition-colors hover:text-white/60"
        >
          ← Exit to app
        </Link>
      </div>
    </aside>
  );
}
