import { AccessPlanType, BillingInterval, Course } from '@smartklass/database';

export enum AccessGrantSource {
  CREATOR_OWNER = 'CREATOR_OWNER',
  FREE_PLAN = 'FREE_PLAN',
  LIFETIME_PURCHASE = 'LIFETIME_PURCHASE',
  SUBSCRIPTION_MONTHLY = 'SUBSCRIPTION_MONTHLY',
  SUBSCRIPTION_YEARLY = 'SUBSCRIPTION_YEARLY',
  SUBSCRIPTION_WEEKLY = 'SUBSCRIPTION_WEEKLY',
  PREVIEW = 'PREVIEW',
}

export type ResolvedCourseAccess = {
  hasAccess: boolean;
  source: AccessGrantSource | null;
  accessPlanId: string | null;
  accessPlanName: string | null;
  accessPlanType: AccessPlanType | null;
  expiresAt: Date | null;
  isOwner: boolean;
};

export type CourseAccessStatusDto = {
  courseId: string;
  hasAccess: boolean;
  canWatch: boolean;
  source: AccessGrantSource | null;
  isOwner: boolean;
  hasActiveSubscription: boolean;
  accessPlan: {
    id: string;
    name: string;
    planType: AccessPlanType;
    billingInterval: BillingInterval | null;
  } | null;
  expiresAt: string | null;
};

export type LessonWatchYoutubeDto = {
  videoId: string;
  embedUrl: string;
  watchUrl: string;
  thumbnailUrl: string | null;
  provider: string;
};

export type LessonWatchDto = {
  id: string;
  moduleId: string;
  courseId: string;
  title: string;
  description: string | null;
  materialsDescription: string | null;
  sortOrder: number;
  durationSeconds: number | null;
  isPreview: boolean;
  youtube: LessonWatchYoutubeDto | null;
  resources: Array<{
    id: string;
    title: string;
    description: string | null;
    resourceType: string;
    url: string;
    purchaseUrl: string | null;
    accessMode: string;
    sortOrder: number;
  }>;
};

export type CourseWatchDto = {
  course: {
    id: string;
    slug: string;
    title: string;
    subtitle: string | null;
    description: string;
    thumbnailUrl: string | null;
  };
  access: CourseAccessStatusDto;
  modules: Array<{
    id: string;
    title: string;
    description: string | null;
    sortOrder: number;
    lessons: LessonWatchDto[];
  }>;
};

export type CourseAccessContext = {
  course: Course;
  access: ResolvedCourseAccess;
};
