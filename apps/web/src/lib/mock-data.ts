import { calculatePlatformFee } from '@smartklass/shared';

export type MockCourse = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  thumbnailUrl: string;
  creator: MockCreator;
  rating: number;
  reviewCount: number;
  subscriberCount: number;
  viewerCount: number;
  lessonCount: number;
  durationHours: number;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  category: string;
  isFeatured?: boolean;
  priceFromCents: number;
  billingInterval?: 'lifetime' | 'weekly' | 'monthly' | 'yearly' | 'free';
  hasMultiplePlans?: boolean;
  publishedAt: string;
  language: string;
  offersCertificate?: boolean;
  trailerYoutubeId?: string | null;
  previewMaterialsDescription?: string | null;
};

export type MockCreator = {
  id: string;
  handle: string;
  displayName: string;
  headline: string;
  bio: string;
  avatarUrl: string;
  courseCount: number;
  studentCount: number;
  rating: number;
};

export type MockPlan = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  billingInterval: 'lifetime' | 'weekly' | 'monthly' | 'yearly' | 'free';
  features: string[];
  highlighted?: boolean;
};

/** Used by creator Studio `PricingCard` — not a public pricing page. */

export const mockCreators: MockCreator[] = [
  {
    id: 'creator_1',
    handle: 'chef-maria',
    displayName: 'Chef Maria Rossi',
    headline: 'Award-winning pasta chef & culinary educator',
    bio: 'Maria has taught thousands of home cooks to master Italian pasta from scratch.',
    avatarUrl:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
    courseCount: 3,
    studentCount: 12400,
    rating: 4.9,
  },
  {
    id: 'creator_2',
    handle: 'jake-guitar',
    displayName: 'Jake Morrison',
    headline: 'Session guitarist & music theory coach',
    bio: 'Jake breaks down complex guitar techniques into approachable daily practice.',
    avatarUrl:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
    courseCount: 2,
    studentCount: 8200,
    rating: 4.8,
  },
  {
    id: 'creator_3',
    handle: 'sarah-design',
    displayName: 'Sarah Chen',
    headline: 'Product designer at top startups',
    bio: 'Sarah teaches visual design systems used by modern product teams.',
    avatarUrl:
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop',
    courseCount: 4,
    studentCount: 15600,
    rating: 4.9,
  },
];

export const mockCourses: MockCourse[] = [
  {
    id: 'course_1',
    slug: 'pasta-basics',
    title: 'Pasta Basics',
    subtitle: 'From dough to dinner in one weekend',
    description:
      'Learn to make fresh pasta, classic sauces, and restaurant-quality plates at home.',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800&h=500&fit=crop',
    creator: mockCreators[0],
    rating: 4.9,
    reviewCount: 312,
    subscriberCount: 8200,
    viewerCount: 10500,
    lessonCount: 24,
    durationHours: 6,
    level: 'Beginner',
    category: 'Culinary',
    isFeatured: true,
    priceFromCents: 1499,
    billingInterval: 'monthly',
    hasMultiplePlans: true,
    publishedAt: '2025-11-12T10:00:00.000Z',
    language: 'en',
    offersCertificate: true,
    trailerYoutubeId: '8oC23E5GaU4',
  },
  {
    id: 'course_2',
    slug: 'guitar-fundamentals',
    title: 'Guitar Fundamentals',
    subtitle: 'Build confidence from your first chord',
    description:
      'A structured path through chords, rhythm, and your first complete songs.',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800&h=500&fit=crop',
    creator: mockCreators[1],
    rating: 4.8,
    reviewCount: 198,
    subscriberCount: 5400,
    viewerCount: 11800,
    lessonCount: 32,
    durationHours: 8,
    level: 'Beginner',
    category: 'Music',
    priceFromCents: 9900,
    billingInterval: 'lifetime',
    hasMultiplePlans: false,
    publishedAt: '2026-01-08T14:00:00.000Z',
    language: 'en',
    offersCertificate: true,
  },
  {
    id: 'course_3',
    slug: 'design-systems-101',
    title: 'Design Systems 101',
    subtitle: 'Ship cohesive products faster',
    description:
      'Tokens, components, and documentation patterns for scalable product design.',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&h=500&fit=crop',
    creator: mockCreators[2],
    rating: 4.9,
    reviewCount: 421,
    subscriberCount: 9100,
    viewerCount: 9200,
    lessonCount: 18,
    durationHours: 5,
    level: 'Intermediate',
    category: 'Design',
    isFeatured: true,
    priceFromCents: 7900,
    billingInterval: 'lifetime',
    hasMultiplePlans: false,
    publishedAt: '2025-09-20T09:00:00.000Z',
    language: 'en',
    offersCertificate: true,
  },
  {
    id: 'course_4',
    slug: 'advanced-pasta',
    title: 'Advanced Pasta Shapes',
    subtitle: 'Hand-rolled specialties from Italy',
    description: 'Master orecchiette, tortellini, and stuffed pastas with pro techniques.',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=800&h=500&fit=crop',
    creator: mockCreators[0],
    rating: 4.9,
    reviewCount: 87,
    subscriberCount: 2100,
    viewerCount: 15200,
    lessonCount: 16,
    durationHours: 4,
    level: 'Advanced',
    category: 'Culinary',
    priceFromCents: 7900,
    billingInterval: 'lifetime',
    hasMultiplePlans: false,
    publishedAt: '2026-06-28T16:00:00.000Z',
    language: 'es',
  },
];

export const mockCategories = [
  'All',
  'Culinary',
  'Music',
  'Design',
  'Business',
  'Photography',
  'Wellness',
];

export function getCourseBySlug(slug: string): MockCourse | undefined {
  return mockCourses.find((course) => course.slug === slug);
}

export function getCourseById(id: string): MockCourse | undefined {
  return mockCourses.find((course) => course.id === id);
}

export function getCreatorByHandle(handle: string): MockCreator | undefined {
  return mockCreators.find((creator) => creator.handle === handle);
}

/** Platform fee revenue from a creator's subscribers (SmartKlass share, not creator earnings). */
export function getCreatorPlatformRevenueCents(creator: MockCreator): number {
  return mockCourses
    .filter((course) => course.creator.handle === creator.handle)
    .reduce((total, course) => {
      const { platformFeeCents } = calculatePlatformFee(course.priceFromCents);
      return total + platformFeeCents * course.subscriberCount;
    }, 0);
}

export function compareCreatorsByPlatformRevenue(a: MockCreator, b: MockCreator): number {
  return getCreatorPlatformRevenueCents(b) - getCreatorPlatformRevenueCents(a);
}

export type CatalogSort = 'explore' | 'recent' | 'certificates';

/** Explore tab: subscribers first, then rating, then creator catalog depth. */
export function compareExploreCourses(
  a: Pick<MockCourse, 'subscriberCount' | 'rating' | 'reviewCount' | 'creator'>,
  b: Pick<MockCourse, 'subscriberCount' | 'rating' | 'reviewCount' | 'creator'>,
): number {
  if (b.subscriberCount !== a.subscriberCount) {
    return b.subscriberCount - a.subscriberCount;
  }

  if (b.rating !== a.rating) {
    return b.rating - a.rating;
  }

  if (b.creator.courseCount !== a.creator.courseCount) {
    return b.creator.courseCount - a.creator.courseCount;
  }

  return b.reviewCount - a.reviewCount;
}

/** Trending: most viewers first, then most recently published. */
export function compareTrendingCourses(
  a: Pick<MockCourse, 'viewerCount' | 'publishedAt'>,
  b: Pick<MockCourse, 'viewerCount' | 'publishedAt'>,
): number {
  if (b.viewerCount !== a.viewerCount) {
    return b.viewerCount - a.viewerCount;
  }

  return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
}

export function filterCatalogCourses(options: {
  category?: string;
  sort?: CatalogSort;
  query?: string;
  language?: string;
  creator?: string;
}): MockCourse[] {
  const category = options.category ?? 'All';
  const sort = options.sort ?? 'explore';
  const query = options.query?.trim().toLowerCase() ?? '';
  const language = options.language ?? 'All';
  const creator = options.creator ?? 'All';

  let results = mockCourses.filter((course) => {
    const matchesCategory = category === 'All' || course.category === category;
    const matchesLanguage = language === 'All' || course.language === language;
    const matchesCreator = creator === 'All' || course.creator.handle === creator;
    const matchesCertificate =
      sort !== 'certificates' || Boolean(course.offersCertificate);

    if (!matchesCategory || !matchesLanguage || !matchesCreator || !matchesCertificate) {
      return false;
    }

    if (!query) {
      return true;
    }

    const haystack = [
      course.title,
      course.subtitle,
      course.description,
      course.category,
      course.creator.displayName,
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(query);
  });

  if (sort === 'recent') {
    results = [...results].sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );
  } else if (sort === 'explore') {
    results = [...results].sort(compareExploreCourses);
  } else {
    results = [...results].sort((a, b) => {
      if (Boolean(a.isFeatured) !== Boolean(b.isFeatured)) {
        return a.isFeatured ? -1 : 1;
      }
      if (b.rating !== a.rating) {
        return b.rating - a.rating;
      }
      return b.reviewCount - a.reviewCount;
    });
  }

  return results;
}
