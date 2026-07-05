import type { AccessPlan, CreateAccessPlanInput } from '@/lib/api/access-plans';
import type { PricingPlan } from '@/components/cards/PricingCard';
import type { StudioAccessPlan, StudioPlanKind } from '@/lib/studio/types';

const planKindLabels: Record<StudioPlanKind, string> = {
  FREE: 'Free preview',
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
  YEARLY: 'Yearly',
  LIFETIME: 'Lifetime',
  VIP: 'VIP',
};

export function isPersistedAccessPlanId(planId: string): boolean {
  return !planId.startsWith('local_') && !planId.startsWith('plan_');
}

export function apiAccessPlanToStudio(plan: AccessPlan): StudioAccessPlan {
  return {
    id: plan.id,
    courseId: plan.courseId,
    name: plan.name,
    description: plan.description ?? '',
    kind: apiPlanToStudioKind(plan),
    priceCents: plan.priceCents,
    currency: plan.currency,
    isActive: plan.isActive,
    subscriberCount: 0,
    features: plan.features.map((feature) => feature.label),
  };
}

function apiPlanToStudioKind(plan: AccessPlan): StudioPlanKind {
  if (plan.planType === 'FREE') {
    return 'FREE';
  }

  if (plan.planType === 'ONE_TIME') {
    return 'LIFETIME';
  }

  switch (plan.billingInterval) {
    case 'WEEKLY':
      return 'WEEKLY';
    case 'YEARLY':
      return 'YEARLY';
    case 'MONTHLY':
    default:
      return 'MONTHLY';
  }
}

export function studioKindToCreateInput(
  plan: Pick<
    StudioAccessPlan,
    'name' | 'description' | 'kind' | 'priceCents' | 'currency' | 'features'
  >,
): CreateAccessPlanInput {
  if (plan.kind === 'FREE') {
    return {
      name: plan.name,
      description: plan.description,
      planType: 'FREE',
      priceCents: 0,
      currency: plan.currency,
      features: plan.features.map((label, index) => ({
        key: `feature_${index + 1}`,
        label,
        sortOrder: index,
      })),
    };
  }

  if (plan.kind === 'LIFETIME' || plan.kind === 'VIP') {
    return {
      name: plan.name,
      description: plan.description,
      planType: 'ONE_TIME',
      priceCents: plan.priceCents,
      currency: plan.currency,
      features: plan.features.map((label, index) => ({
        key: `feature_${index + 1}`,
        label,
        sortOrder: index,
      })),
    };
  }

  const billingInterval =
    plan.kind === 'WEEKLY' ? 'WEEKLY' : plan.kind === 'YEARLY' ? 'YEARLY' : 'MONTHLY';

  return {
    name: plan.name,
    description: plan.description,
    planType: 'SUBSCRIPTION',
    priceCents: plan.priceCents,
    currency: plan.currency,
    billingInterval,
    features: plan.features.map((label, index) => ({
      key: `feature_${index + 1}`,
      label,
      sortOrder: index,
    })),
  };
}

export type DisplayPricingPlan = PricingPlan & {
  id: string;
  previewOnly: boolean;
};

function studioKindToBillingInterval(
  kind: StudioPlanKind,
): PricingPlan['billingInterval'] {
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

export function studioPlanToDisplayPlan(
  plan: StudioAccessPlan,
  options?: { highlighted?: boolean },
): DisplayPricingPlan | null {
  if (!plan.isActive || plan.kind === 'FREE' || plan.priceCents <= 0) {
    return null;
  }

  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    priceCents: plan.priceCents,
    billingInterval: studioKindToBillingInterval(plan.kind),
    features: plan.features,
    highlighted: options?.highlighted ?? plan.kind === 'MONTHLY',
    previewOnly: !isPersistedAccessPlanId(plan.id),
  };
}

export function apiPlanToDisplayPlan(
  plan: AccessPlan,
  options?: { highlighted?: boolean },
): DisplayPricingPlan | null {
  const studioPlan = apiAccessPlanToStudio(plan);
  return studioPlanToDisplayPlan(studioPlan, options);
}

export function sortDisplayPlans(plans: DisplayPricingPlan[]): DisplayPricingPlan[] {
  return [...plans].sort((left, right) => {
    const leftKind =
      left.billingInterval === 'weekly'
        ? 0
        : left.billingInterval === 'monthly'
          ? 1
          : left.billingInterval === 'yearly'
            ? 2
            : 3;
    const rightKind =
      right.billingInterval === 'weekly'
        ? 0
        : right.billingInterval === 'monthly'
          ? 1
          : right.billingInterval === 'yearly'
            ? 2
            : 3;

    if (leftKind !== rightKind) {
      return leftKind - rightKind;
    }

    return left.priceCents - right.priceCents;
  });
}

export function studioPlansToDisplayPlans(
  plans: StudioAccessPlan[],
): DisplayPricingPlan[] {
  return sortDisplayPlans(
    plans
      .map((plan) => studioPlanToDisplayPlan(plan))
      .filter((plan): plan is DisplayPricingPlan => plan !== null),
  );
}

export function buildDefaultAccessPlans(courseId: string): StudioAccessPlan[] {
  const makePlan = (
    id: string,
    kind: StudioPlanKind,
    priceCents: number,
    features: string[],
  ): StudioAccessPlan => ({
    id,
    courseId,
    name: `${planKindLabels[kind]} Access`,
    description:
      kind === 'FREE'
        ? 'Let learners preview lessons before subscribing'
        : kind === 'MONTHLY'
          ? 'Recurring monthly subscriber price'
          : 'One-time payment for permanent access',
    kind,
    priceCents,
    currency: 'USD',
    isActive: true,
    subscriberCount: 0,
    features,
  });

  return [
    makePlan(`local_free_${courseId}`, 'FREE', 0, [
      'Preview lessons at no cost',
      'No payment required',
    ]),
    makePlan(`local_monthly_${courseId}`, 'MONTHLY', 1999, [
      'Full course access while subscribed',
      'Cancel anytime',
    ]),
    makePlan(`local_lifetime_${courseId}`, 'LIFETIME', 9900, [
      'Lifetime access',
      'One-time payment',
    ]),
  ];
}
