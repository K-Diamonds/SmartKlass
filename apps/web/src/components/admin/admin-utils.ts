export function formatAdminDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatAdminCents(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

export const TRUST_LEVEL_META: Record<
  string,
  { label: string; tone: 'neutral' | 'success' | 'warning' | 'danger' }
> = {
  NEW: { label: 'New', tone: 'neutral' },
  STANDARD: { label: 'Standard', tone: 'neutral' },
  TRUSTED: { label: 'Trusted', tone: 'success' },
  HIGH_RISK: { label: 'High risk', tone: 'warning' },
  SUSPENDED: { label: 'Suspended', tone: 'danger' },
};
