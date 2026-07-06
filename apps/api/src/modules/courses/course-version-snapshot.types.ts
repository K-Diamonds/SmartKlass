export type CourseSnapshotModule = {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  sortOrder: number;
  lessons: CourseSnapshotLesson[];
};

export type CourseSnapshotLesson = {
  id: string;
  moduleId: string;
  title: string;
  description: string | null;
  materialsDescription: string | null;
  youtubeVideoId: string | null;
  youtubeUrl: string | null;
  status: string;
  sortOrder: number;
  durationMinutes: number | null;
  resources: CourseSnapshotResource[];
};

export type CourseSnapshotResource = {
  id: string;
  lessonId: string;
  title: string;
  description: string | null;
  resourceType: string;
  url: string;
  purchaseUrl: string | null;
  accessMode: string;
  sortOrder: number;
};

export type CourseSnapshotAccessPlan = {
  id: string;
  courseId: string;
  name: string;
  description: string | null;
  planType: string;
  priceCents: number;
  currency: string;
  billingInterval: string | null;
  accessDurationDays: number | null;
  stripePriceId: string | null;
  isActive: boolean;
  sortOrder: number;
};

export type CourseSnapshotData = {
  course: {
    title: string;
    subtitle: string | null;
    description: string;
    thumbnailUrl: string | null;
    trailerYoutubeId: string | null;
    previewMaterialsDescription: string | null;
    estimatedHours: number | string | null;
    difficultyLevel: string;
    language: string;
    offersCertificate: boolean;
  };
  modules: CourseSnapshotModule[];
  accessPlans: CourseSnapshotAccessPlan[];
};

export type VersionDiffItem = {
  path: string;
  change: 'added' | 'removed' | 'modified';
  before?: string | number | boolean | null;
  after?: string | number | boolean | null;
};

export function diffCourseSnapshots(
  before: CourseSnapshotData,
  after: CourseSnapshotData,
): VersionDiffItem[] {
  const items: VersionDiffItem[] = [];

  for (const key of Object.keys(after.course) as Array<keyof CourseSnapshotData['course']>) {
    const prev = before.course[key];
    const next = after.course[key];
    if (JSON.stringify(prev) !== JSON.stringify(next)) {
      items.push({
        path: `course.${key}`,
        change: 'modified',
        before: prev as string | number | boolean | null,
        after: next as string | number | boolean | null,
      });
    }
  }

  const beforeModules = new Map(before.modules.map((m) => [m.id, m]));
  const afterModules = new Map(after.modules.map((m) => [m.id, m]));

  for (const [id, mod] of afterModules) {
    if (!beforeModules.has(id)) {
      items.push({ path: `modules.${id}`, change: 'added', after: mod.title });
    } else if (beforeModules.get(id)!.title !== mod.title) {
      items.push({
        path: `modules.${id}.title`,
        change: 'modified',
        before: beforeModules.get(id)!.title,
        after: mod.title,
      });
    }
  }

  for (const [id, mod] of beforeModules) {
    if (!afterModules.has(id)) {
      items.push({ path: `modules.${id}`, change: 'removed', before: mod.title });
    }
  }

  const beforePlans = new Map(before.accessPlans.map((p) => [p.id, p]));
  const afterPlans = new Map(after.accessPlans.map((p) => [p.id, p]));

  for (const [id, plan] of afterPlans) {
    if (!beforePlans.has(id)) {
      items.push({ path: `accessPlans.${id}`, change: 'added', after: plan.name });
    } else if (beforePlans.get(id)!.priceCents !== plan.priceCents) {
      items.push({
        path: `accessPlans.${id}.priceCents`,
        change: 'modified',
        before: beforePlans.get(id)!.priceCents,
        after: plan.priceCents,
      });
    }
  }

  for (const [id, plan] of beforePlans) {
    if (!afterPlans.has(id)) {
      items.push({ path: `accessPlans.${id}`, change: 'removed', before: plan.name });
    }
  }

  return items;
}
