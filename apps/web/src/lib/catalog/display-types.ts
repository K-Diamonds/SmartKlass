export type CreatorDisplay = {
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

export type CourseDisplay = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  thumbnailUrl: string;
  creator: CreatorDisplay;
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

/** Studio pricing card display shape — not a public pricing page DTO. */
export type PlanDisplay = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  billingInterval: 'lifetime' | 'weekly' | 'monthly' | 'yearly' | 'free';
  features: string[];
  highlighted?: boolean;
};
