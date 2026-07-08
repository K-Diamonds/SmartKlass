import {
  AccessPlanType,
  BillingInterval,
  CourseStatus,
  LessonStatus,
  NotificationType,
  PaymentStatus,
  PrismaClient,
  PurchaseStatus,
  SubscriptionStatus,
  UserStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

/** Catalog data sourced from Figma export (SmartKlass.zip → src/app/App.tsx) */

const FIGMA_CATEGORIES = [
  {
    slug: 'design',
    name: 'Design',
    description: 'Brand, visual identity, and motion design.',
    sortOrder: 1,
  },
  {
    slug: 'photography',
    name: 'Photography',
    description: 'Cinematic photography and visual storytelling.',
    sortOrder: 2,
  },
  {
    slug: 'coding',
    name: 'Coding',
    description: 'Full-stack development and modern web apps.',
    sortOrder: 3,
  },
  {
    slug: 'business',
    name: 'Business',
    description: 'Entrepreneurship, fundraising, and career skills.',
    sortOrder: 4,
  },
  {
    slug: 'music',
    name: 'Music',
    description: 'Instruments, composition, and performance.',
    sortOrder: 5,
  },
] as const;

const FIGMA_CREATORS = [
  {
    email: 'isabelle@example.com',
    slug: 'isabelle-moreau',
    displayName: 'Isabelle Moreau',
    headline: 'Brand Design & Visual Identity',
    bio: 'Award-winning brand designer helping teams ship cohesive visual systems.',
    avatarUrl:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=300&fit=crop&auto=format',
  },
  {
    email: 'marcus@example.com',
    slug: 'marcus-chen',
    displayName: 'Marcus Chen',
    headline: 'Cinematic Photography',
    bio: 'Director and photographer teaching cinematic composition and lighting.',
    avatarUrl:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&auto=format',
  },
  {
    email: 'priya@example.com',
    slug: 'priya-sharma',
    displayName: 'Priya Sharma',
    headline: 'Full-Stack Engineering',
    bio: 'Staff engineer teaching production-grade Next.js and TypeScript.',
    avatarUrl:
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&h=300&fit=crop&auto=format',
  },
  {
    email: 'david@example.com',
    slug: 'david-okafor',
    displayName: 'David Okafor',
    headline: 'Venture Capital & Startups',
    bio: 'Former VC partner on fundraising, pitch decks, and term sheets.',
    avatarUrl:
      'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&h=300&fit=crop&auto=format',
  },
  {
    email: 'elena@example.com',
    slug: 'elena-volkov',
    displayName: 'Elena Volkov',
    headline: 'Jazz Piano & Composition',
    bio: 'Concert pianist teaching creative expression through jazz harmony.',
    avatarUrl:
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&h=300&fit=crop&auto=format',
  },
  {
    email: 'kai@example.com',
    slug: 'kai-nakamura',
    displayName: 'Kai Nakamura',
    headline: 'Motion Design & After Effects',
    bio: 'Motion designer for brands and studios worldwide.',
    avatarUrl:
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300&h=300&fit=crop&auto=format',
  },
] as const;

const FIGMA_COURSES = [
  {
    slug: 'brand-identity-design-masterclass',
    title: 'Brand Identity Design Masterclass',
    subtitle: 'Build memorable brands from strategy to visual systems',
    description:
      'Learn the complete brand identity process — research, positioning, logo systems, typography, color, and delivery.',
    creatorSlug: 'isabelle-moreau',
    categorySlug: 'design',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=600&h=380&fit=crop&auto=format',
    trailerYoutubeId: 'jRcfE2xxSAw',
    estimatedHours: 24.5,
    priceCents: 18900,
    lessonCount: 86,
    publishedAt: '2026-01-10',
    lessons: [
      {
        moduleTitle: 'Brand Foundations',
        moduleDescription: 'Strategy, positioning, and creative briefs.',
        lessons: [
          {
            title: 'What Makes a Strong Brand',
            youtubeVideoId: 'jRcfE2xxSAw',
            durationSeconds: 840,
          },
          {
            title: 'Building a Visual Identity System',
            youtubeVideoId: 'jRcfE2xxSAw',
            durationSeconds: 960,
          },
        ],
      },
    ],
  },
  {
    slug: 'cinematic-photography',
    title: 'The Art of Cinematic Photography',
    subtitle: 'Light, composition, and storytelling for stills and motion',
    description:
      'Master cinematic photography — framing, lighting setups, color grading concepts, and narrative sequencing.',
    creatorSlug: 'marcus-chen',
    categorySlug: 'photography',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=600&h=380&fit=crop&auto=format',
    trailerYoutubeId: 'pfAlxwyi5Ug',
    estimatedHours: 18.25,
    priceCents: 14900,
    lessonCount: 62,
    publishedAt: '2026-01-20',
    lessons: [
      {
        moduleTitle: 'Cinematic Composition',
        moduleDescription: 'Framing, lenses, and visual language.',
        lessons: [
          {
            title: 'Reading Light Like a Cinematographer',
            youtubeVideoId: 'pfAlxwyi5Ug',
            durationSeconds: 720,
          },
          {
            title: 'Storytelling Through Single Frames',
            youtubeVideoId: 'pfAlxwyi5Ug',
            durationSeconds: 900,
          },
        ],
      },
    ],
  },
  {
    slug: 'full-stack-nextjs-15',
    title: 'Full-Stack Development with Next.js 15',
    subtitle: 'Production apps with App Router, auth, and databases',
    description:
      'Ship full-stack applications with Next.js 15, React Server Components, API routes, and deployment best practices.',
    creatorSlug: 'priya-sharma',
    categorySlug: 'coding',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&h=380&fit=crop&auto=format',
    trailerYoutubeId: 'b4ba60j_4o8',
    estimatedHours: 42.17,
    priceCents: 22900,
    lessonCount: 124,
    publishedAt: '2026-02-01',
    lessons: [
      {
        moduleTitle: 'Next.js Foundations',
        moduleDescription: 'App Router, layouts, and data fetching.',
        lessons: [
          {
            title: 'Next.js 15 App Router Overview',
            youtubeVideoId: 'b4ba60j_4o8',
            durationSeconds: 1100,
          },
          {
            title: 'Server vs Client Components',
            youtubeVideoId: 'b4ba60j_4o8',
            durationSeconds: 980,
          },
        ],
      },
    ],
  },
  {
    slug: 'venture-capital-fundraising',
    title: 'Venture Capital & Startup Fundraising',
    subtitle: 'Pitch decks, term sheets, and investor conversations',
    description:
      'Learn how top founders raise capital — narrative, metrics, diligence, and negotiating terms with confidence.',
    creatorSlug: 'david-okafor',
    categorySlug: 'business',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=600&h=380&fit=crop&auto=format',
    trailerYoutubeId: '8S0FdCqM7CE',
    estimatedHours: 16.75,
    priceCents: 29900,
    lessonCount: 54,
    publishedAt: '2026-02-15',
    lessons: [
      {
        moduleTitle: 'Fundraising Strategy',
        moduleDescription: 'When to raise, how much, and from whom.',
        lessons: [
          {
            title: 'How Venture Capital Actually Works',
            youtubeVideoId: '8S0FdCqM7CE',
            durationSeconds: 780,
          },
          {
            title: 'Crafting a Compelling Pitch Narrative',
            youtubeVideoId: '8S0FdCqM7CE',
            durationSeconds: 840,
          },
        ],
      },
    ],
  },
  {
    slug: 'jazz-piano-creative-expression',
    title: 'Jazz Piano for Creative Expression',
    subtitle: 'Harmony, improvisation, and personal voice at the keys',
    description:
      'Develop jazz piano skills from chord voicings to improvisation — build a creative practice you love.',
    creatorSlug: 'elena-volkov',
    categorySlug: 'music',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=600&h=380&fit=crop&auto=format',
    trailerYoutubeId: 'p6xDH4ky4NY',
    estimatedHours: 28.33,
    priceCents: 12900,
    lessonCount: 96,
    publishedAt: '2026-03-01',
    lessons: [
      {
        moduleTitle: 'Jazz Harmony Basics',
        moduleDescription: 'Voicings, extensions, and voice leading.',
        lessons: [
          {
            title: 'Essential Jazz Chord Voicings',
            youtubeVideoId: 'p6xDH4ky4NY',
            durationSeconds: 900,
          },
          {
            title: 'Improvising Over Standards',
            youtubeVideoId: 'p6xDH4ky4NY',
            durationSeconds: 1020,
          },
        ],
      },
    ],
  },
  {
    slug: 'motion-design-after-effects',
    title: 'Motion Design & After Effects Pro',
    subtitle: 'Animation principles for brand and product motion',
    description:
      'Professional motion design workflow — keyframes, easing, typography animation, and export for web and social.',
    creatorSlug: 'kai-nakamura',
    categorySlug: 'design',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=600&h=380&fit=crop&auto=format',
    trailerYoutubeId: 'Ei6q5D6c_1Y',
    estimatedHours: 32,
    priceCents: 19900,
    lessonCount: 108,
    publishedAt: '2026-03-10',
    lessons: [
      {
        moduleTitle: 'Motion Fundamentals',
        moduleDescription: 'Timing, spacing, and After Effects essentials.',
        lessons: [
          {
            title: 'The 12 Principles of Animation',
            youtubeVideoId: 'Ei6q5D6c_1Y',
            durationSeconds: 880,
          },
          {
            title: 'Typography in Motion',
            youtubeVideoId: 'Ei6q5D6c_1Y',
            durationSeconds: 940,
          },
        ],
      },
    ],
  },
] as const;

const LEGACY_COURSE_SLUGS = [
  'pasta-basics',
  'perfect-pasta-at-home',
  'guitar-fundamentals',
  'acoustic-guitar-essentials',
  'design-systems-101',
  'advanced-pasta',
  'strength-basics-30-days',
] as const;

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 12;
const DEV_PASSWORD = 'password123';

async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

async function archiveLegacyCourses(): Promise<void> {
  const now = new Date();
  for (const slug of LEGACY_COURSE_SLUGS) {
    const course = await prisma.course.findUnique({ where: { slug } });
    if (!course || course.deletedAt) continue;
    await prisma.course.update({
      where: { id: course.id },
      data: { deletedAt: now, status: CourseStatus.ARCHIVED },
    });
    console.log(`  archived legacy course: ${slug}`);
  }
}

async function main() {
  console.log('Seeding SmartKlass database from Figma catalog...');

  const devPasswordHash = await hashPassword(DEV_PASSWORD);

  await archiveLegacyCourses();

  const categoryBySlug = new Map<string, string>();
  for (const cat of FIGMA_CATEGORIES) {
    const row = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name,
        description: cat.description,
        sortOrder: cat.sortOrder,
      },
      create: {
        slug: cat.slug,
        name: cat.name,
        description: cat.description,
        sortOrder: cat.sortOrder,
      },
    });
    categoryBySlug.set(cat.slug, row.id);
  }

  const learner = await prisma.user.upsert({
    where: { email: 'alex@example.com' },
    update: { passwordHash: devPasswordHash },
    create: {
      email: 'alex@example.com',
      passwordHash: devPasswordHash,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      profile: {
        create: {
          displayName: 'Alex Rivera',
          bio: 'Always learning something new.',
          timezone: 'America/Los_Angeles',
        },
      },
    },
    include: { profile: true },
  });

  const learner2 = await prisma.user.upsert({
    where: { email: 'jordan@example.com' },
    update: { passwordHash: devPasswordHash },
    create: {
      email: 'jordan@example.com',
      passwordHash: devPasswordHash,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      profile: {
        create: {
          displayName: 'Jordan Kim',
          bio: 'Design enthusiast and weekend creator.',
          timezone: 'America/New_York',
        },
      },
    },
    include: { profile: true },
  });

  const creatorBySlug = new Map<string, string>();

  for (const creator of FIGMA_CREATORS) {
    const user = await prisma.user.upsert({
      where: { email: creator.email },
      update: { passwordHash: devPasswordHash },
      create: {
        email: creator.email,
        passwordHash: devPasswordHash,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        profile: {
          create: {
            displayName: creator.displayName,
            bio: creator.bio,
          },
        },
        creatorProfile: {
          create: {
            slug: creator.slug,
            displayName: creator.displayName,
            headline: creator.headline,
            bio: creator.bio,
            avatarUrl: creator.avatarUrl,
            isVerified: true,
            isActive: true,
          },
        },
      },
      include: { creatorProfile: true },
    });

    let profileId = user.creatorProfile?.id;
    if (!profileId) {
      const existing = await prisma.creatorProfile.findUnique({
        where: { userId: user.id },
      });
      if (existing) {
        await prisma.creatorProfile.update({
          where: { id: existing.id },
          data: {
            slug: creator.slug,
            displayName: creator.displayName,
            headline: creator.headline,
            bio: creator.bio,
            avatarUrl: creator.avatarUrl,
            isVerified: true,
            isActive: true,
            deletedAt: null,
          },
        });
        profileId = existing.id;
      } else {
        const created = await prisma.creatorProfile.create({
          data: {
            userId: user.id,
            slug: creator.slug,
            displayName: creator.displayName,
            headline: creator.headline,
            bio: creator.bio,
            avatarUrl: creator.avatarUrl,
            isVerified: true,
            isActive: true,
          },
        });
        profileId = created.id;
      }
    } else {
      await prisma.creatorProfile.update({
        where: { id: profileId },
        data: {
          displayName: creator.displayName,
          headline: creator.headline,
          bio: creator.bio,
          avatarUrl: creator.avatarUrl,
          isVerified: true,
          isActive: true,
          deletedAt: null,
        },
      });
    }

    creatorBySlug.set(creator.slug, profileId);
  }

  const courseRecords = new Map<string, { id: string; title: string }>();

  for (const course of FIGMA_COURSES) {
    const creatorProfileId = creatorBySlug.get(course.creatorSlug);
    const categoryId = categoryBySlug.get(course.categorySlug);
    if (!creatorProfileId || !categoryId) {
      throw new Error(`Missing creator or category for ${course.slug}`);
    }

    const publishedAt = new Date(course.publishedAt);
    const existing = await prisma.course.findUnique({
      where: { slug: course.slug },
      include: { modules: { include: { lessons: true } } },
    });

    if (existing) {
      await prisma.course.update({
        where: { id: existing.id },
        data: {
          creatorProfileId,
          title: course.title,
          subtitle: course.subtitle,
          description: course.description,
          thumbnailUrl: course.thumbnailUrl,
          trailerYoutubeId: course.trailerYoutubeId,
          status: CourseStatus.PUBLISHED,
          estimatedHours: course.estimatedHours,
          language: 'en',
          offersCertificate: true,
          certificatePaidAt: publishedAt,
          publishedAt,
          deletedAt: null,
        },
      });

      const hasCategory = await prisma.courseCategory.findFirst({
        where: { courseId: existing.id, categoryId },
      });
      if (!hasCategory) {
        await prisma.courseCategory.create({
          data: { courseId: existing.id, categoryId },
        });
      }

      courseRecords.set(course.slug, { id: existing.id, title: course.title });
      continue;
    }

    const created = await prisma.course.create({
      data: {
        creatorProfileId,
        slug: course.slug,
        title: course.title,
        subtitle: course.subtitle,
        description: course.description,
        thumbnailUrl: course.thumbnailUrl,
        trailerYoutubeId: course.trailerYoutubeId,
        status: CourseStatus.PUBLISHED,
        estimatedHours: course.estimatedHours,
        language: 'en',
        offersCertificate: true,
        certificatePaidAt: publishedAt,
        publishedAt,
        categories: {
          create: [{ categoryId }],
        },
        modules: {
          create: course.lessons.map((mod, modIndex) => ({
            title: mod.moduleTitle,
            description: mod.moduleDescription,
            sortOrder: modIndex + 1,
            lessons: {
              create: mod.lessons.map((lesson, lessonIndex) => ({
                title: lesson.title,
                youtubeVideoId: lesson.youtubeVideoId,
                youtubeUrl: `https://www.youtube.com/watch?v=${lesson.youtubeVideoId}`,
                durationSeconds: lesson.durationSeconds,
                sortOrder: lessonIndex + 1,
                status: LessonStatus.PUBLISHED,
              })),
            },
          })),
        },
      },
    });

    courseRecords.set(course.slug, { id: created.id, title: course.title });
  }

  const brandCourse = courseRecords.get('brand-identity-design-masterclass');
  const photoCourse = courseRecords.get('cinematic-photography');

  if (brandCourse) {
    const lifetimePlan = await prisma.accessPlan.upsert({
      where: { id: 'seed_brand_lifetime' },
      update: {
        courseId: brandCourse.id,
        priceCents: 18900,
        isActive: true,
      },
      create: {
        id: 'seed_brand_lifetime',
        courseId: brandCourse.id,
        name: 'Lifetime Access',
        description: 'One-time purchase. Watch forever.',
        planType: AccessPlanType.ONE_TIME,
        priceCents: 18900,
        currency: 'USD',
        isActive: true,
        sortOrder: 1,
        features: {
          create: [
            { key: 'lifetime_access', label: 'Lifetime course access', sortOrder: 1 },
            { key: 'downloadable_resources', label: 'Downloadable lesson resources', sortOrder: 2 },
          ],
        },
      },
    });

    const monthlyPlan = await prisma.accessPlan.upsert({
      where: { id: 'seed_brand_monthly' },
      update: {
        courseId: brandCourse.id,
        priceCents: 1999,
        isActive: true,
      },
      create: {
        id: 'seed_brand_monthly',
        courseId: brandCourse.id,
        name: 'Monthly Access',
        description: 'Subscribe monthly. Cancel anytime.',
        planType: AccessPlanType.SUBSCRIPTION,
        priceCents: 1999,
        currency: 'USD',
        billingInterval: BillingInterval.MONTHLY,
        isActive: true,
        sortOrder: 2,
        features: {
          create: [
            { key: 'streaming_access', label: 'Stream all lessons while subscribed', sortOrder: 1 },
          ],
        },
      },
    });

    const existingPurchase = await prisma.userPurchase.findFirst({
      where: { userId: learner.id, courseId: brandCourse.id },
    });

    if (!existingPurchase) {
      let payment = await prisma.payment.findFirst({
        where: { stripePaymentIntentId: 'pi_seed_brand_purchase_001' },
      });
      if (!payment) {
        payment = await prisma.payment.create({
          data: {
            userId: learner.id,
            status: PaymentStatus.SUCCEEDED,
            amountCents: lifetimePlan.priceCents ?? 18900,
            currency: 'USD',
            stripePaymentIntentId: 'pi_seed_brand_purchase_001',
            paidAt: new Date('2026-03-01'),
          },
        });
      }

      const purchaseForPayment = await prisma.userPurchase.findFirst({
        where: { paymentId: payment.id },
      });

      if (!purchaseForPayment) {
        const purchase = await prisma.userPurchase.create({
          data: {
            userId: learner.id,
            courseId: brandCourse.id,
            accessPlanId: lifetimePlan.id,
            paymentId: payment.id,
            status: PurchaseStatus.COMPLETED,
            amountCents: lifetimePlan.priceCents ?? 18900,
            currency: 'USD',
            purchasedAt: new Date('2026-03-01'),
          },
        });

        await prisma.courseAccess.create({
          data: {
            userId: learner.id,
            courseId: brandCourse.id,
            accessPlanId: lifetimePlan.id,
            userPurchaseId: purchase.id,
            startsAt: new Date('2026-03-01'),
          },
        });

        await prisma.notification.create({
          data: {
            userId: learner.id,
            type: NotificationType.PURCHASE_CONFIRMED,
            title: 'Purchase confirmed',
            body: `You now have lifetime access to "${brandCourse.title}".`,
            data: { courseId: brandCourse.id, accessPlanId: lifetimePlan.id },
            readAt: new Date('2026-03-01'),
          },
        });
      }
    }

    const existingSubscription = await prisma.userSubscription.findFirst({
      where: { userId: learner2.id, accessPlanId: monthlyPlan.id },
    });

    if (!existingSubscription) {
      const periodStart = new Date();
      periodStart.setDate(1);
      const periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      const subscription = await prisma.userSubscription.create({
        data: {
          userId: learner2.id,
          accessPlanId: monthlyPlan.id,
          status: SubscriptionStatus.ACTIVE,
          stripeSubscriptionId: 'sub_seed_brand_monthly_001',
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        },
      });

      await prisma.courseAccess.create({
        data: {
          userId: learner2.id,
          courseId: brandCourse.id,
          accessPlanId: monthlyPlan.id,
          userSubscriptionId: subscription.id,
          startsAt: periodStart,
          expiresAt: periodEnd,
        },
      });
    }

    await prisma.review.upsert({
      where: {
        userId_courseId: { userId: learner.id, courseId: brandCourse.id },
      },
      update: {},
      create: {
        userId: learner.id,
        courseId: brandCourse.id,
        rating: 5,
        title: 'Exactly what I needed for client work',
        body: 'Isabelle breaks down brand systems in a way that finally clicked for me.',
      },
    });

    await prisma.favorite.upsert({
      where: {
        userId_courseId: { userId: learner.id, courseId: brandCourse.id },
      },
      update: {},
      create: { userId: learner.id, courseId: brandCourse.id },
    });
  }

  if (photoCourse) {
    await prisma.favorite.upsert({
      where: {
        userId_courseId: { userId: learner2.id, courseId: photoCourse.id },
      },
      update: {},
      create: { userId: learner2.id, courseId: photoCourse.id },
    });
  }

  console.log('Seed complete.');
  console.log(`  Categories:      ${FIGMA_CATEGORIES.length}`);
  console.log(`  Creators:        ${FIGMA_CREATORS.length}`);
  console.log(`  Courses:         ${FIGMA_COURSES.length}`);
  console.log(`  Learners:        2`);
  console.log('');
  console.log(`Sample accounts (password: ${DEV_PASSWORD}):`);
  console.log('  alex@example.com    — learner (lifetime brand course access)');
  console.log('  jordan@example.com  — learner (monthly brand subscription)');
  for (const c of FIGMA_CREATORS) {
    console.log(`  ${c.email.padEnd(20)} — creator (${c.displayName})`);
  }
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
