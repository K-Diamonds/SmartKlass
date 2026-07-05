import Link from 'next/link';
import type { MockPlan } from '@/lib/mock-data';
import { cn, formatPrice } from '@/lib/utils';
import {
  calculatePlatformFee,
  type PlatformFeeBreakdown,
} from '@smartklass/shared';
import { Check } from 'lucide-react';

export type PricingPlan = Pick<
  MockPlan,
  'name' | 'description' | 'priceCents' | 'billingInterval' | 'features' | 'highlighted'
>;

type PricingCardProps = {
  plan: PricingPlan;
  className?: string;
  variant?: 'marketing' | 'creator';
  platformFee?: PlatformFeeBreakdown;
  action?: React.ReactNode;
};

function billingLabel(interval: PricingPlan['billingInterval']): string {
  switch (interval) {
    case 'weekly':
      return '/week';
    case 'monthly':
      return '/mo';
    case 'yearly':
      return '/year';
    case 'lifetime':
      return 'one-time';
    default:
      return '';
  }
}

function PlatformFeeDetails({ breakdown }: { breakdown: PlatformFeeBreakdown }) {
  if (breakdown.subscriberPriceCents <= 0) {
    return null;
  }

  const atMinimumPrice =
    breakdown.subscriberPriceCents <= breakdown.platformFeeCents &&
    breakdown.creatorEarningsCents === 0;

  return (
    <div className="mt-4 rounded-2xl border border-border bg-muted/40 p-4 text-sm">
      <p className="font-medium text-foreground">Per subscriber</p>
      {atMinimumPrice && (
        <p className="mt-2 text-xs text-muted-foreground">
          At the {formatPrice(breakdown.subscriberPriceCents)} minimum, SmartKlass keeps the full
          charge — you earn {formatPrice(0)}.
        </p>
      )}
      <dl className="mt-3 space-y-2 text-muted-foreground">
        <div className="flex items-center justify-between gap-4">
          <dt>Learner pays</dt>
          <dd className="font-medium text-foreground">
            {formatPrice(breakdown.subscriberPriceCents)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt>SmartKlass fee ({breakdown.feeRuleLabel})</dt>
          <dd className="font-medium text-foreground">
            −{formatPrice(breakdown.platformFeeCents)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-border pt-2">
          <dt className="font-medium text-foreground">You earn</dt>
          <dd className="font-semibold text-accent">
            {formatPrice(breakdown.creatorEarningsCents)}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export function PricingCard({
  plan,
  className,
  variant = 'marketing',
  platformFee,
  action,
}: PricingCardProps) {
  const fee =
    platformFee ??
    (variant === 'creator' ? calculatePlatformFee(plan.priceCents) : undefined);

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-3xl border bg-surface p-8 shadow-soft transition-all duration-300',
        variant === 'marketing' && 'hover:-translate-y-1',
        plan.highlighted
          ? 'border-accent shadow-card ring-1 ring-accent/20'
          : 'border-border',
        className,
      )}
    >
      {plan.highlighted && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-4 py-1 text-xs font-semibold text-accent-foreground">
          Most popular
        </span>
      )}

      <h3 className="font-display text-xl font-semibold tracking-tight text-foreground">
        {plan.name}
      </h3>
      <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>

      <div className="mt-6 flex items-baseline gap-1">
        <span className="font-display text-4xl font-semibold tracking-tight text-foreground">
          {plan.priceCents === 0 ? 'Free' : formatPrice(plan.priceCents)}
        </span>
        {plan.priceCents > 0 && (
          <span className="text-sm text-muted-foreground">
            {billingLabel(plan.billingInterval)}
          </span>
        )}
      </div>

      {variant === 'creator' && fee && <PlatformFeeDetails breakdown={fee} />}

      {plan.features.length > 0 && (
        <ul className="mt-8 flex-1 space-y-3">
          {plan.features.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-2.5 text-sm text-muted-foreground"
            >
              <Check size={14} className="mt-0.5 shrink-0 text-accent" />
              {feature}
            </li>
          ))}
        </ul>
      )}

      {variant === 'marketing' ? (
        action ? (
          <div className="mt-8">{action}</div>
        ) : (
          <Link
            href="/register"
            className={cn(
              'mt-8 block rounded-full py-3 text-center text-sm font-semibold transition-opacity hover:opacity-90',
              plan.highlighted
                ? 'bg-accent text-accent-foreground'
                : 'bg-foreground text-background',
            )}
          >
            {plan.priceCents === 0 ? 'Get started' : 'Start now'}
          </Link>
        )
      ) : (
        action && <div className="mt-8">{action}</div>
      )}
    </div>
  );
}
