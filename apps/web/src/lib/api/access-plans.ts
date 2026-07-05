import { apiFetch } from './client';

export type AccessPlanFeature = {
  key: string;
  label: string;
  description: string | null;
  sortOrder: number;
};

export type AccessPlan = {
  id: string;
  courseId: string;
  name: string;
  description: string | null;
  planType: 'FREE' | 'ONE_TIME' | 'SUBSCRIPTION';
  priceCents: number;
  currency: string;
  billingInterval: 'WEEKLY' | 'MONTHLY' | 'YEARLY' | null;
  accessDurationDays: number | null;
  isActive: boolean;
  features: AccessPlanFeature[];
};

export type CreateAccessPlanInput = {
  name: string;
  description?: string;
  planType: AccessPlan['planType'];
  priceCents?: number;
  currency?: string;
  billingInterval?: AccessPlan['billingInterval'];
  accessDurationDays?: number;
  features?: Array<{
    key: string;
    label: string;
    description?: string;
    sortOrder?: number;
  }>;
};

export type UpdateAccessPlanInput = {
  name?: string;
  description?: string;
  priceCents?: number;
  isActive?: boolean;
};

export function listCourseAccessPlans(courseId: string): Promise<AccessPlan[]> {
  return apiFetch<AccessPlan[]>(`/courses/${courseId}/access-plans`);
}

export function listCreatorCourseAccessPlans(
  courseId: string,
): Promise<AccessPlan[]> {
  return apiFetch<AccessPlan[]>(`/creator/courses/${courseId}/access-plans`);
}

export function createAccessPlan(
  courseId: string,
  input: CreateAccessPlanInput,
): Promise<AccessPlan> {
  return apiFetch<AccessPlan>(`/courses/${courseId}/access-plans`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateAccessPlan(
  planId: string,
  input: UpdateAccessPlanInput,
): Promise<AccessPlan> {
  return apiFetch<AccessPlan>(`/access-plans/${planId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}
