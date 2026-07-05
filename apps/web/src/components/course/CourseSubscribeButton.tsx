'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { listCourseAccessPlans, type AccessPlan } from '@/lib/api/access-plans';
import {
  createCoursePlanCheckout,
  ownerSelfSubscribeCoursePlan,
} from '@/lib/api/billing';
import { ApiRequestError } from '@/lib/api/types';
import { useAuthSession } from '@/hooks/useAuthSession';
import { cn } from '@/lib/utils';

type CourseSubscribeButtonProps = {
  courseId: string;
  label: string;
  accessPlanId?: string;
  ownerPreview?: boolean;
  className?: string;
};

function pickCheckoutPlan(plans: AccessPlan[]): AccessPlan | undefined {
  const paidPlans = plans.filter(
    (plan) =>
      plan.isActive && plan.planType !== 'FREE' && plan.priceCents > 0,
  );

  const monthly = paidPlans.find(
    (plan) =>
      plan.planType === 'SUBSCRIPTION' && plan.billingInterval === 'MONTHLY',
  );

  return monthly ?? paidPlans[0];
}

function buildReturnPath(pathname: string, searchParams: URLSearchParams): string {
  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function CourseSubscribeButton({
  courseId,
  label,
  accessPlanId,
  ownerPreview = false,
  className,
}: CourseSubscribeButtonProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthSession();
  const returnPath = buildReturnPath(pathname, searchParams);
  const loginHref = `/login?next=${encodeURIComponent(returnPath)}`;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buttonClass = cn(
    'inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-60',
    className,
  );

  const startCheckout = async (planId?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      let checkoutPlanId = planId ?? accessPlanId;

      if (!checkoutPlanId) {
        const plans = await listCourseAccessPlans(courseId);
        const plan = pickCheckoutPlan(plans);
        if (!plan) {
          setError('No paid plans are available for this course yet.');
          return;
        }
        checkoutPlanId = plan.id;
      }

      if (ownerPreview) {
        await ownerSelfSubscribeCoursePlan(checkoutPlanId);
        window.location.href = '/library';
        return;
      }

      const origin = window.location.origin;
      const checkout = await createCoursePlanCheckout({
        accessPlanId: checkoutPlanId,
        successUrl: `${origin}/subscriptions?checkout=success`,
        cancelUrl: `${origin}${returnPath}`,
      });

      window.location.href = checkout.checkoutUrl;
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.message
          : 'Could not start checkout. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthLoading) {
    return (
      <span className={cn(buttonClass, 'opacity-60')} aria-hidden>
        {label}
      </span>
    );
  }

  if (!isAuthenticated) {
    return (
      <Link href={loginHref} className={buttonClass}>
        {label}
      </Link>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => void startCheckout(accessPlanId)}
        disabled={isLoading}
        className={buttonClass}
      >
        {isLoading ? 'Redirecting…' : label}
      </button>
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
