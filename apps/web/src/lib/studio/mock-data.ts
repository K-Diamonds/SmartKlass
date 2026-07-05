import type {
  StudioAccessPlan,
  StudioCourse,
  StudioReview,
  StudioRevenuePoint,
  StudioSubscriber,
} from './types';

export const studioCourses: StudioCourse[] = [
  {
    id: 'course_1',
    slug: 'pasta-basics',
    title: 'Pasta Basics',
    subtitle: 'From dough to dinner in one weekend',
    description:
      'Learn to make fresh pasta, classic sauces, and restaurant-quality plates at home.',
    status: 'PUBLISHED',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800&h=500&fit=crop',
    trailerYoutubeId: '8oC23E5GaU4',
    trailerYoutubeUrl: 'https://www.youtube.com/watch?v=8oC23E5GaU4',
    estimatedHours: 6,
    difficultyLevel: 'Beginner',
    lessonCount: 24,
    moduleCount: 6,
    studentCount: 12400,
    revenueCents: 9842000,
    rating: 4.9,
    offersCertificate: true,
    certificatePaidAt: '2025-11-12T10:00:00.000Z',
    modules: [
      {
        id: 'mod_1',
        courseId: 'course_1',
        title: 'Getting started',
        description: 'Welcome and essential setup',
        sortOrder: 0,
        lessons: [
          {
            id: 'les_1',
            moduleId: 'mod_1',
            title: 'Welcome & course overview',
            description: 'What you will learn and how to get the most from this course.',
            materialsDescription: '',
            status: 'PUBLISHED',
            isPreview: false,
            sortOrder: 0,
            durationSeconds: 320,
            youtubeVideoId: 'dQw4w9WgXcQ',
            youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            resources: [],
          },
          {
            id: 'les_2',
            moduleId: 'mod_1',
            title: 'Essential tools & ingredients',
            description: 'Everything you need before your first batch of dough.',
            materialsDescription: 'Download the shopping list and optional pasta machine guide below.',
            status: 'PUBLISHED',
            isPreview: false,
            sortOrder: 1,
            durationSeconds: 540,
            youtubeVideoId: null,
            youtubeUrl: null,
            resources: [
              {
                id: 'res_1',
                title: 'Ingredient shopping list',
                description: 'Print this before heading to the store.',
                resourceType: 'PDF',
                url: 'https://example.com/list.pdf',
                purchaseUrl: '',
                accessMode: 'INCLUDED',
              },
            ],
          },
        ],
      },
      {
        id: 'mod_2',
        courseId: 'course_1',
        title: 'Core techniques',
        description: 'Master dough and shaping fundamentals',
        sortOrder: 1,
        lessons: [
          {
            id: 'les_3',
            moduleId: 'mod_2',
            title: 'Making fresh dough',
            description: 'Step-by-step dough preparation with pro tips.',
            materialsDescription: '',
            status: 'PUBLISHED',
            isPreview: false,
            sortOrder: 0,
            durationSeconds: 720,
            youtubeVideoId: 'dQw4w9WgXcQ',
            youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            resources: [],
          },
          {
            id: 'les_4',
            moduleId: 'mod_2',
            title: 'Shaping classic pasta',
            description: 'Tagliatelle, fettuccine, and hand-cut shapes.',
            materialsDescription: '',
            status: 'DRAFT',
            isPreview: false,
            sortOrder: 1,
            durationSeconds: 900,
            youtubeVideoId: null,
            youtubeUrl: null,
            resources: [],
          },
        ],
      },
    ],
  },
  {
    id: 'course_2',
    slug: 'advanced-pasta',
    title: 'Advanced Pasta Shapes',
    subtitle: 'Hand-rolled specialties from Italy',
    description: 'Master orecchiette, tortellini, and stuffed pastas.',
    status: 'DRAFT',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=800&h=500&fit=crop',
    trailerYoutubeId: null,
    trailerYoutubeUrl: null,
    estimatedHours: null,
    difficultyLevel: 'Beginner',
    lessonCount: 16,
    moduleCount: 4,
    studentCount: 0,
    revenueCents: 0,
    rating: 0,
    offersCertificate: false,
    certificatePaidAt: null,
    modules: [],
  },
];

export const studioAccessPlans: Record<string, StudioAccessPlan[]> = {
  course_1: [
    {
      id: 'plan_free',
      courseId: 'course_1',
      name: 'Free Preview',
      description: 'Access preview lessons at no cost.',
      kind: 'FREE',
      priceCents: 0,
      currency: 'USD',
      isActive: true,
      subscriberCount: 4200,
      features: ['Preview lessons', 'Course syllabus'],
    },
    {
      id: 'plan_weekly',
      courseId: 'course_1',
      name: 'Weekly Access',
      description: 'Flexible weekly billing for learners.',
      kind: 'WEEKLY',
      priceCents: 500,
      currency: 'USD',
      isActive: true,
      subscriberCount: 156,
      features: ['All lessons', 'Downloadable resources', 'Cancel anytime'],
    },
    {
      id: 'plan_monthly',
      courseId: 'course_1',
      name: 'Monthly Access',
      description: 'Stream all lessons while subscribed.',
      kind: 'MONTHLY',
      priceCents: 1499,
      currency: 'USD',
      isActive: true,
      subscriberCount: 890,
      features: ['All lessons', 'Downloadable resources', 'Cancel anytime'],
    },
    {
      id: 'plan_yearly',
      courseId: 'course_1',
      name: 'Yearly Access',
      description: 'Best value — two months free.',
      kind: 'YEARLY',
      priceCents: 14900,
      currency: 'USD',
      isActive: true,
      subscriberCount: 312,
      features: ['All lessons', 'Downloadable resources', 'Priority updates'],
    },
    {
      id: 'plan_lifetime',
      courseId: 'course_1',
      name: 'Lifetime Access',
      description: 'One-time purchase. Watch forever.',
      kind: 'LIFETIME',
      priceCents: 7900,
      currency: 'USD',
      isActive: true,
      subscriberCount: 2100,
      features: ['Lifetime access', 'All resources', 'Future updates'],
    },
    {
      id: 'plan_vip',
      courseId: 'course_1',
      name: 'VIP Coaching',
      description: 'Lifetime access plus monthly live Q&A.',
      kind: 'VIP',
      priceCents: 19900,
      currency: 'USD',
      isActive: true,
      subscriberCount: 48,
      features: ['Everything in Lifetime', 'Monthly live sessions', 'Direct messaging'],
    },
  ],
};

export const studioSubscribers: StudioSubscriber[] = [
  {
    id: 'sub_1',
    name: 'Alex Rivera',
    email: 'alex@example.com',
    planName: 'Monthly Access',
    courseTitle: 'Pasta Basics',
    status: 'ACTIVE',
    since: '2026-03-12',
    mrrCents: 1499,
  },
  {
    id: 'sub_2',
    name: 'Jordan Lee',
    email: 'jordan@example.com',
    planName: 'Yearly Access',
    courseTitle: 'Pasta Basics',
    status: 'ACTIVE',
    since: '2026-01-05',
    mrrCents: 1241,
  },
  {
    id: 'sub_3',
    name: 'Sam Patel',
    email: 'sam@example.com',
    planName: 'Monthly Access',
    courseTitle: 'Pasta Basics',
    status: 'PAST_DUE',
    since: '2025-11-20',
    mrrCents: 1499,
  },
];

export const studioReviews: StudioReview[] = [
  {
    id: 'rev_1',
    courseTitle: 'Pasta Basics',
    author: 'Morgan Chen',
    rating: 5,
    title: 'Life-changing pasta skills',
    body: 'I finally understand dough hydration. The module on shaping alone was worth the price.',
    createdAt: '2026-05-18',
    isPublished: true,
  },
  {
    id: 'rev_2',
    courseTitle: 'Pasta Basics',
    author: 'Taylor Brooks',
    rating: 4,
    title: 'Clear and approachable',
    body: 'Great pacing. Would love more vegetarian sauce variations in a future update.',
    createdAt: '2026-04-02',
    isPublished: true,
  },
  {
    id: 'rev_3',
    courseTitle: 'Pasta Basics',
    author: 'Casey Nguyen',
    rating: 5,
    title: 'Studio-quality production',
    body: 'Feels like a premium MasterClass but more practical for home cooks.',
    createdAt: '2026-06-11',
    isPublished: false,
  },
];

export const studioRevenueHistory: StudioRevenuePoint[] = [
  { month: 'Jan', revenueCents: 420000, purchases: 38, subscriptions: 120 },
  { month: 'Feb', revenueCents: 510000, purchases: 42, subscriptions: 145 },
  { month: 'Mar', revenueCents: 680000, purchases: 55, subscriptions: 178 },
  { month: 'Apr', revenueCents: 720000, purchases: 48, subscriptions: 195 },
  { month: 'May', revenueCents: 890000, purchases: 62, subscriptions: 210 },
  { month: 'Jun', revenueCents: 940000, purchases: 58, subscriptions: 228 },
];

export function getStudioCourse(id: string): StudioCourse | undefined {
  return studioCourses.find((course) => course.id === id);
}

export function getStudioLesson(
  courseId: string,
  lessonId: string,
): { course: StudioCourse; module: StudioCourse['modules'][0]; lesson: StudioCourse['modules'][0]['lessons'][0] } | null {
  const course = getStudioCourse(courseId);
  if (!course) return null;

  for (const courseModule of course.modules) {
    const lesson = courseModule.lessons.find((item) => item.id === lessonId);
    if (lesson) {
      return { course, module: courseModule, lesson };
    }
  }

  return null;
}

export function getStudioModule(
  courseId: string,
  moduleId: string,
): { course: StudioCourse; module: StudioCourse['modules'][0] } | null {
  const course = getStudioCourse(courseId);
  if (!course) return null;

  const courseModule = course.modules.find((item) => item.id === moduleId);
  if (!courseModule) return null;

  return { course, module: courseModule };
}

export function getStudioPlans(courseId: string): StudioAccessPlan[] {
  return studioAccessPlans[courseId] ?? [];
}
