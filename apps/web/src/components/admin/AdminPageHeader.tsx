import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type AdminPageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: AdminPageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-white/8 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#d4a853]">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/50">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

type AdminPanelProps = {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
};

export function AdminPanel({
  title,
  description,
  actions,
  children,
  className,
  noPadding,
}: AdminPanelProps) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-xl border border-white/8 bg-[#12121a] shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]',
        className,
      )}
    >
      {(title || actions) && (
        <div className="flex items-start justify-between gap-4 border-b border-white/8 px-5 py-4">
          <div>
            {title && (
              <h2 className="text-sm font-semibold text-white">{title}</h2>
            )}
            {description && (
              <p className="mt-1 text-xs text-white/45">{description}</p>
            )}
          </div>
          {actions}
        </div>
      )}
      <div className={cn(!noPadding && 'p-5')}>{children}</div>
    </section>
  );
}
