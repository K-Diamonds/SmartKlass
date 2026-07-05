export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

export function formatPrice(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export type CourseBillingInterval =
  | 'free'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'lifetime';

export function coursePriceSuffix(interval: CourseBillingInterval): string {
  switch (interval) {
    case 'weekly':
      return '/wk';
    case 'monthly':
      return '/mo';
    case 'yearly':
      return '/year';
    default:
      return '';
  }
}

type FormatCoursePriceOptions = {
  priceCents: number;
  billingInterval?: CourseBillingInterval;
  hasMultiplePlans?: boolean;
  compact?: boolean;
  freeLabel?: string;
};

export function formatCoursePrice({
  priceCents,
  billingInterval = 'lifetime',
  hasMultiplePlans = false,
  compact = false,
  freeLabel = 'Free',
}: FormatCoursePriceOptions): string {
  if (priceCents === 0) {
    return freeLabel;
  }

  const amount = formatPrice(priceCents);
  const suffix = coursePriceSuffix(billingInterval);

  if (compact) {
    return `${amount}${suffix}`;
  }

  if (hasMultiplePlans) {
    return `From ${amount}${suffix}`;
  }

  return `Full access ${amount}${suffix}`;
}

export function formatCourseAccessCta(options: FormatCoursePriceOptions): string {
  if (options.priceCents === 0) {
    return 'Get free access';
  }

  const amount = formatPrice(options.priceCents);
  const suffix = coursePriceSuffix(options.billingInterval ?? 'lifetime');

  if (options.hasMultiplePlans) {
    return `Get access — from ${amount}${suffix}`;
  }

  return `Get full access — ${amount}${suffix}`;
}

export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${remaining.toString().padStart(2, '0')}`;
}
