import type { StudioAccessPlan } from './types';

const STORAGE_PREFIX = 'smartklass-studio-plans:';

export function saveStudioPlans(courseId: string, plans: StudioAccessPlan[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  const key = `${STORAGE_PREFIX}${courseId}`;
  const serialized = JSON.stringify(plans);
  sessionStorage.setItem(key, serialized);
  localStorage.setItem(key, serialized);
}

export function loadStudioPlans(courseId: string): StudioAccessPlan[] | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const key = `${STORAGE_PREFIX}${courseId}`;
  const raw = sessionStorage.getItem(key) ?? localStorage.getItem(key);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StudioAccessPlan[];
  } catch {
    return null;
  }
}
