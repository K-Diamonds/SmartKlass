import { apiFetchPaginated } from './client';

export type SubscriptionItem = {
  id: string;
  accessPlanId: string;
  status: 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELED' | 'EXPIRED' | 'PAUSED';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  canceledAt: string | null;
  accessPlan: {
    name: string;
    planType: string;
    courseId: string;
    priceCents: number;
    billingInterval: string | null;
    course: {
      title: string;
      slug: string;
    };
  };
};

export async function listMySubscriptions(): Promise<SubscriptionItem[]> {
  return apiFetchPaginated<SubscriptionItem>('/subscriptions/me?limit=100');
}
