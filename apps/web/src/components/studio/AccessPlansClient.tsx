'use client';

import { useEffect, useState } from 'react';
import { saveStudioPlans } from '@/lib/studio/session-plans';
import {
  createAccessPlan,
  updateAccessPlan,
} from '@/lib/api/access-plans';
import { getAuthToken } from '@/lib/api/client';
import { PricingCard } from '@/components/cards/PricingCard';
import { PlanKindBadge } from '@/components/studio/StudioBadges';
import {
  apiAccessPlanToStudio,
  isPersistedAccessPlanId,
  studioKindToCreateInput,
} from '@/lib/studio/map-access-plan';
import {
  PLATFORM_FEE_MIN_CENTS,
  PLATFORM_FEE_PERCENT,
  SUBSCRIBER_PRICE_MIN_CENTS,
  calculatePlatformFee,
} from '@smartklass/shared';
import type { StudioAccessPlan, StudioPlanKind } from '@/lib/studio/types';
import { cn, formatPrice } from '@/lib/utils';

const RECURRING_KINDS: StudioPlanKind[] = ['WEEKLY', 'MONTHLY', 'YEARLY'];
const LIFETIME_KIND: StudioPlanKind = 'LIFETIME';
const PAID_KINDS: StudioPlanKind[] = [...RECURRING_KINDS, LIFETIME_KIND];

const PAID_MIN_PRICE_CENTS = SUBSCRIBER_PRICE_MIN_CENTS ?? PLATFORM_FEE_MIN_CENTS;

const planKindLabels: Record<StudioPlanKind, string> = {
  FREE: 'Free preview',
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
  YEARLY: 'Yearly',
  LIFETIME: 'Lifetime',
  VIP: 'VIP',
};

const planKindDescriptions: Record<StudioPlanKind, string> = {
  FREE: 'Let learners preview lessons before subscribing',
  WEEKLY: 'Recurring weekly subscriber price',
  MONTHLY: 'Recurring monthly subscriber price',
  YEARLY: 'Annual subscriber price — often discounted',
  LIFETIME: 'One-time payment for permanent access',
  VIP: 'Optional premium tier with extras',
};

const defaultPrices: Record<StudioPlanKind, number> = {
  FREE: 0,
  WEEKLY: 500,
  MONTHLY: 1999,
  YEARLY: 19900,
  LIFETIME: 9900,
  VIP: 29900,
};

function clampPaidPriceCents(priceCents: number): number {
  if (!Number.isFinite(priceCents)) {
    return PAID_MIN_PRICE_CENTS;
  }

  return Math.max(priceCents, PAID_MIN_PRICE_CENTS);
}

type AccessPlansClientProps = {
  courseId: string;
  courseTitle: string;
  plans: StudioAccessPlan[];
};

function toBillingInterval(
  kind: StudioPlanKind,
): 'free' | 'weekly' | 'monthly' | 'yearly' | 'lifetime' {
  switch (kind) {
    case 'WEEKLY':
      return 'weekly';
    case 'MONTHLY':
      return 'monthly';
    case 'YEARLY':
      return 'yearly';
    case 'LIFETIME':
    case 'VIP':
      return 'lifetime';
    default:
      return 'free';
  }
}

function isRecurringKind(kind: StudioPlanKind): boolean {
  return kind === 'WEEKLY' || kind === 'MONTHLY' || kind === 'YEARLY';
}

export function AccessPlansClient({
  courseId,
  courseTitle,
  plans: initialPlans,
}: AccessPlansClientProps) {
  const [plans, setPlans] = useState(initialPlans);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [draftPrice, setDraftPrice] = useState('');
  const [priceError, setPriceError] = useState<string | null>(null);
  const [isSavingPrice, setIsSavingPrice] = useState(false);

  useEffect(() => {
    saveStudioPlans(courseId, plans);
  }, [courseId, plans]);

  const existingKinds = new Set(plans.map((plan) => plan.kind));
  const missingPaidKinds = PAID_KINDS.filter((kind) => !existingKinds.has(kind));

  const toggleActive = async (planId: string) => {
    const plan = plans.find((item) => item.id === planId);
    if (!plan) {
      return;
    }

    const nextActive = !plan.isActive;

    setPlans((prev) =>
      prev.map((item) =>
        item.id === planId ? { ...item, isActive: nextActive } : item,
      ),
    );

    if (getAuthToken() && isPersistedAccessPlanId(planId)) {
      try {
        const updated = await updateAccessPlan(planId, { isActive: nextActive });
        setPlans((prev) =>
          prev.map((item) =>
            item.id === planId ? apiAccessPlanToStudio(updated) : item,
          ),
        );
      } catch {
        setPlans((prev) =>
          prev.map((item) =>
            item.id === planId ? { ...item, isActive: plan.isActive } : item,
          ),
        );
      }
    }
  };

  const replacePlan = (planId: string, nextPlan: StudioAccessPlan) => {
    setPlans((prev) =>
      prev.map((plan) => (plan.id === planId ? nextPlan : plan)),
    );
  };

  const persistPlan = async (
    plan: StudioAccessPlan,
    priceCents: number,
  ): Promise<StudioAccessPlan> => {
    const nextPlan = {
      ...plan,
      priceCents: plan.kind === 'FREE' ? 0 : clampPaidPriceCents(priceCents),
    };

    if (!getAuthToken()) {
      return nextPlan;
    }

    if (isPersistedAccessPlanId(plan.id)) {
      const updated = await updateAccessPlan(plan.id, {
        priceCents: nextPlan.priceCents,
      });
      return apiAccessPlanToStudio(updated);
    }

    const created = await createAccessPlan(
      plan.courseId,
      studioKindToCreateInput(nextPlan),
    );
    return apiAccessPlanToStudio(created);
  };

  const createPlan = async (kind: StudioPlanKind) => {
    const newPlan: StudioAccessPlan = {
      id: `local_${kind.toLowerCase()}_${courseId}_${plans.length + 1}`,
      courseId,
      name: `${planKindLabels[kind]} Access`,
      description: planKindDescriptions[kind],
      kind,
      priceCents: defaultPrices[kind],
      currency: 'USD',
      isActive: true,
      subscriberCount: 0,
      features:
        kind === 'FREE'
          ? ['Preview lessons at no cost', 'No payment required']
          : isRecurringKind(kind)
            ? ['Full course access while subscribed', 'Cancel anytime']
            : kind === 'LIFETIME'
              ? ['Lifetime access', 'One-time payment']
              : ['Full course access', 'One-time payment'],
    };

    if (getAuthToken()) {
      try {
        const created = await createAccessPlan(
          courseId,
          studioKindToCreateInput(newPlan),
        );
        setPlans((prev) => [...prev, apiAccessPlanToStudio(created)]);
        return;
      } catch {
        // Fall back to local draft plan when API create fails.
      }
    }

    setPlans((prev) => [...prev, newPlan]);
  };

  const startEditing = (plan: StudioAccessPlan) => {
    setEditingPlanId(plan.id);
    setDraftPrice((plan.priceCents / 100).toFixed(2));
    setPriceError(null);
  };

  const savePrice = async (planId: string) => {
    const plan = plans.find((item) => item.id === planId);
    if (!plan || plan.kind === 'FREE') {
      return;
    }

    const dollars = Number.parseFloat(draftPrice);
    if (!Number.isFinite(dollars)) {
      setPriceError('Enter a valid price.');
      return;
    }

    const priceCents = Math.round(dollars * 100);
    if (priceCents < PAID_MIN_PRICE_CENTS) {
      setPriceError(`Minimum price is ${formatPrice(PAID_MIN_PRICE_CENTS)}.`);
      return;
    }

    setIsSavingPrice(true);
    setPriceError(null);

    try {
      const savedPlan = await persistPlan(plan, priceCents);
      replacePlan(planId, savedPlan);
      setEditingPlanId(null);
      setDraftPrice('');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not save price.';
      setPriceError(message);
    } finally {
      setIsSavingPrice(false);
    }
  };

  const freePlan = plans.find((plan) => plan.kind === 'FREE');
  const paidPlans = plans.filter((plan) => plan.kind !== 'FREE');

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">
          {courseTitle}
        </p>
        <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight text-foreground">
          Subscriber pricing
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Publishing on SmartKlass is free. Build your course first, then offer weekly,
          monthly, yearly, or lifetime access. Checkout is handled via Stripe.
        </p>
      </div>

      <section className="rounded-3xl border border-accent/25 bg-accent-muted p-6 shadow-soft">
        <h2 className="font-display text-lg font-semibold text-foreground">
          SmartKlass platform fee
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          <strong className="text-foreground">
            {formatPrice(PLATFORM_FEE_MIN_CENTS)} minimum or {PLATFORM_FEE_PERCENT}%
          </strong>{' '}
          platform fee per subscriber payment — whichever is higher. Subscriber pricing starts at{' '}
          <strong className="text-foreground">
            {formatPrice(PAID_MIN_PRICE_CENTS)} minimum price
          </strong>
          . At {formatPrice(PAID_MIN_PRICE_CENTS)}, SmartKlass keeps the full charge and you
          earn {formatPrice(0)}. Above that, SmartKlass collects{' '}
          <strong className="text-foreground">
            {formatPrice(PLATFORM_FEE_MIN_CENTS)} minimum or {PLATFORM_FEE_PERCENT}%
          </strong>{' '}
          per subscriber payment — whichever is higher — and you keep the rest.
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          Example at {formatPrice(1999)}/month: SmartKlass collects{' '}
          {formatPrice(calculatePlatformFee(1999).platformFeeCents)} (
          {calculatePlatformFee(1999).feeRuleLabel}) and you earn{' '}
          {formatPrice(calculatePlatformFee(1999).creatorEarningsCents)} per subscriber.
        </p>
      </section>

      {freePlan && (
        <article className="rounded-3xl border border-border bg-surface p-6 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <PlanKindBadge kind={planKindLabels.FREE} />
              <h3 className="mt-3 font-display text-lg font-semibold text-foreground">
                Free to publish
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {freePlan.description}. No listing fee or upload cost.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void toggleActive(freePlan.id)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium',
                freePlan.isActive
                  ? 'bg-emerald-500/10 text-emerald-700'
                  : 'bg-border-subtle text-muted-foreground',
              )}
            >
              {freePlan.isActive ? 'Preview enabled' : 'Preview off'}
            </button>
          </div>
        </article>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {paidPlans.map((plan) => {
          const isRecurring = isRecurringKind(plan.kind);
          const isEditing = editingPlanId === plan.id;
          const draftPriceCents = isEditing
            ? clampPaidPriceCents(
                Math.round((Number.parseFloat(draftPrice) || 0) * 100),
              )
            : plan.priceCents;

          return (
            <div key={plan.id} className="relative">
              <PricingCard
                variant="creator"
                platformFee={calculatePlatformFee(draftPriceCents)}
                plan={{
                  name: plan.name,
                  description: plan.description,
                  priceCents: isEditing ? draftPriceCents : plan.priceCents,
                  billingInterval: toBillingInterval(plan.kind),
                  features: plan.features,
                  highlighted: plan.kind === 'MONTHLY',
                }}
                action={
                  <div className="space-y-3">
                    {isEditing ? (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <label className="sr-only" htmlFor={`price-${plan.id}`}>
                            Subscriber price in dollars
                          </label>
                          <input
                            id={`price-${plan.id}`}
                            type="number"
                            min={(PAID_MIN_PRICE_CENTS / 100).toFixed(2)}
                            step="0.01"
                            value={draftPrice}
                            onChange={(event) => {
                              setDraftPrice(event.target.value);
                              setPriceError(null);
                            }}
                            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none ring-ring focus:ring-2"
                          />
                          <button
                            type="button"
                            onClick={() => void savePrice(plan.id)}
                            disabled={isSavingPrice}
                            className="shrink-0 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground disabled:opacity-60"
                          >
                            {isSavingPrice ? 'Saving…' : 'Save'}
                          </button>
                        </div>
                        {priceError && editingPlanId === plan.id && (
                          <p className="text-xs text-destructive" role="alert">
                            {priceError}
                          </p>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEditing(plan)}
                        className="w-full rounded-full border border-border py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                      >
                        {isRecurring ? 'Set subscriber price' : 'Set price'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void toggleActive(plan.id)}
                      className={cn(
                        'w-full rounded-full py-2.5 text-xs font-medium',
                        plan.isActive
                          ? 'text-emerald-700'
                          : 'text-muted-foreground',
                      )}
                    >
                      {plan.isActive ? 'Plan is live' : 'Plan is inactive'}
                    </button>
                  </div>
                }
              />
            </div>
          );
        })}
      </div>

      {missingPaidKinds.length > 0 && (
        <section className="rounded-3xl border border-dashed border-border p-6">
          <h3 className="font-display font-semibold text-foreground">Add a plan</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Offer weekly, monthly, yearly, or lifetime access for your subscribers.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {missingPaidKinds.map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => void createPlan(kind)}
                className={cn(
                  'rounded-full px-4 py-2 text-xs font-semibold',
                  kind === LIFETIME_KIND
                    ? 'border border-border font-medium text-foreground hover:bg-muted'
                    : 'bg-accent text-accent-foreground',
                )}
              >
                + {planKindLabels[kind]}
                {isRecurringKind(kind) ? ' plan' : ''}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
