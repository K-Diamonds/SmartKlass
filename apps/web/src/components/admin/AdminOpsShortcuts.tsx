import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  GitCompare,
  Shield,
  ToggleLeft,
  Webhook,
} from 'lucide-react';

const shortcuts = [
  {
    href: '/admin/reconciliation',
    label: 'Reconciliation',
    icon: GitCompare,
    description: 'Stripe ↔ ledger',
  },
  {
    href: '/admin/webhooks',
    label: 'Webhook replay',
    icon: Webhook,
    description: 'Event tooling',
  },
  {
    href: '/admin/feature-flags',
    label: 'Feature flags',
    icon: ToggleLeft,
    description: 'Rollouts',
  },
  {
    href: '/admin/audit-logs',
    label: 'Audit logs',
    icon: Shield,
    description: 'Staff actions',
  },
];

export function AdminOpsShortcuts() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {shortcuts.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="group flex items-start gap-3 rounded-xl border border-white/8 bg-[#12121a] p-4 transition-colors hover:border-[#d4a853]/30 hover:bg-[#16161f]"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/10 group-hover:ring-[#d4a853]/30">
              <Icon size={16} className="text-white/50 group-hover:text-[#d4a853]" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">{item.label}</p>
              <p className="text-xs text-white/40">{item.description}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

type AdminAlertBannerProps = {
  title: string;
  count: number;
  href: string;
  tone?: 'danger' | 'warning';
};

export function AdminAlertBanner({
  title,
  count,
  href,
  tone = 'warning',
}: AdminAlertBannerProps) {
  if (count <= 0) return null;

  const styles =
    tone === 'danger'
      ? 'border-red-500/30 bg-red-500/10 text-red-200'
      : 'border-amber-500/30 bg-amber-500/10 text-amber-200';

  return (
    <Link
      href={href}
      className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition-opacity hover:opacity-90 ${styles}`}
    >
      <span>
        <strong className="font-semibold">{count}</strong> {title}
      </span>
      <span className="text-xs opacity-70">Review →</span>
    </Link>
  );
}

export function AdminGridBackground({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-full">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}
