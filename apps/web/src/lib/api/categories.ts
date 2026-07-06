import { apiFetch } from './client';

export type Category = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  parentId: string | null;
  sortOrder: number;
  courseCount: number;
};

export function listCategories(): Promise<Category[]> {
  return apiFetch<Category[]>('/categories');
}
