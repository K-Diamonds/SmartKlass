export type CourseStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type LessonStatus = 'DRAFT' | 'PUBLISHED';

export type CourseDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export type LessonMaterialAccess = 'INCLUDED' | 'PURCHASE' | 'VIDEO';

export type StudioPlanKind =
  | 'FREE'
  | 'WEEKLY'
  | 'MONTHLY'
  | 'YEARLY'
  | 'LIFETIME'
  | 'VIP';

export type StudioLesson = {
  id: string;
  moduleId: string;
  title: string;
  description: string;
  materialsDescription: string;
  status: LessonStatus;
  isPreview: boolean;
  sortOrder: number;
  durationSeconds: number | null;
  youtubeVideoId: string | null;
  youtubeUrl: string | null;
  resources: Array<{
    id: string;
    title: string;
    description: string;
    resourceType: string;
    url: string;
    purchaseUrl: string;
    accessMode: LessonMaterialAccess;
  }>;
};

export type StudioModule = {
  id: string;
  courseId: string;
  title: string;
  description: string;
  sortOrder: number;
  lessons: StudioLesson[];
};

export type StudioCourse = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string;
  status: CourseStatus;
  thumbnailUrl: string | null;
  trailerYoutubeId: string | null;
  trailerYoutubeUrl: string | null;
  previewMaterialsDescription: string | null;
  estimatedHours: number | null;
  difficultyLevel: CourseDifficulty;
  lessonCount: number;
  moduleCount: number;
  studentCount: number;
  revenueCents: number;
  rating: number;
  modules: StudioModule[];
  offersCertificate: boolean;
  certificatePaidAt: string | null;
};

export type StudioAccessPlan = {
  id: string;
  courseId: string;
  name: string;
  description: string;
  kind: StudioPlanKind;
  priceCents: number;
  currency: string;
  isActive: boolean;
  subscriberCount: number;
  features: string[];
};

export type StudioSubscriber = {
  id: string;
  name: string;
  email: string;
  planName: string;
  courseTitle: string;
  status: 'ACTIVE' | 'CANCELED' | 'PAST_DUE';
  since: string;
  mrrCents: number;
};

export type StudioReview = {
  id: string;
  courseTitle: string;
  author: string;
  rating: number;
  title: string;
  body: string;
  createdAt: string;
  isPublished: boolean;
};

export type StudioRevenuePoint = {
  month: string;
  revenueCents: number;
  purchases: number;
  subscriptions: number;
};
