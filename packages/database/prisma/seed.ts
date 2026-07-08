import {
  AccessPlanType,
  BillingInterval,
  CourseStatus,
  LessonResourceType,
  LessonStatus,
  NotificationType,
  PaymentStatus,
  PrismaClient,
  PurchaseStatus,
  SubscriptionStatus,
  UserStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 12;
const DEV_PASSWORD = 'password123';

async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

async function main() {
  console.log('Seeding SmartKlass database...');

  const devPasswordHash = await hashPassword(DEV_PASSWORD);

  // ---------------------------------------------------------------------------
  // Categories
  // ---------------------------------------------------------------------------
  const cooking = await prisma.category.upsert({
    where: { slug: 'cooking' },
    update: {},
    create: {
      slug: 'cooking',
      name: 'Cooking',
      description: 'Learn to cook restaurant-quality meals at home.',
      sortOrder: 1,
    },
  });

  const music = await prisma.category.upsert({
    where: { slug: 'music' },
    update: {},
    create: {
      slug: 'music',
      name: 'Music',
      description: 'Instruments, production, and performance.',
      sortOrder: 2,
    },
  });

  const fitness = await prisma.category.upsert({
    where: { slug: 'fitness' },
    update: {},
    create: {
      slug: 'fitness',
      name: 'Fitness',
      description: 'Strength, mobility, and wellness programs.',
      sortOrder: 3,
    },
  });

  const business = await prisma.category.upsert({
    where: { slug: 'business' },
    update: {},
    create: {
      slug: 'business',
      name: 'Business',
      description: 'Entrepreneurship, marketing, and career skills.',
      sortOrder: 4,
    },
  });

  // ---------------------------------------------------------------------------
  // Users (single account type — learners and creators are all Users)
  // ---------------------------------------------------------------------------
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
          displayName: 'Jordan Lee',
          bio: 'Fitness enthusiast and lifelong student.',
          timezone: 'America/New_York',
        },
      },
    },
    include: { profile: true },
  });

  const chefUser = await prisma.user.upsert({
    where: { email: 'maria@example.com' },
    update: { passwordHash: devPasswordHash },
    create: {
      email: 'maria@example.com',
      passwordHash: devPasswordHash,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      profile: {
        create: {
          displayName: 'Maria Santos',
          bio: 'Home cook turned culinary instructor.',
          timezone: 'America/Chicago',
        },
      },
      creatorProfile: {
        create: {
          slug: 'maria-santos',
          displayName: 'Chef Maria Santos',
          headline: 'Modern home cooking for busy people',
          bio: 'I teach practical techniques that make everyday meals feel special.',
          isVerified: true,
        },
      },
    },
    include: { creatorProfile: true },
  });

  const musicUser = await prisma.user.upsert({
    where: { email: 'devon@example.com' },
    update: { passwordHash: devPasswordHash },
    create: {
      email: 'devon@example.com',
      passwordHash: devPasswordHash,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      profile: {
        create: {
          displayName: 'Devon Brooks',
          bio: 'Guitarist and music educator.',
          timezone: 'America/Denver',
        },
      },
      creatorProfile: {
        create: {
          slug: 'devon-brooks',
          displayName: 'Devon Brooks',
          headline: 'Play guitar with confidence',
          bio: 'From first chord to stage-ready performance.',
          isVerified: true,
        },
      },
    },
    include: { creatorProfile: true },
  });

  const mariaCreator = chefUser.creatorProfile!;
  const devonCreator = musicUser.creatorProfile!;

  // ---------------------------------------------------------------------------
  // Courses, modules, lessons (YouTube links only — no uploaded video)
  // ---------------------------------------------------------------------------
  const pastaCourse = await prisma.course.upsert({
    where: { slug: 'pasta-basics' },
    update: {
      offersCertificate: true,
      certificatePaidAt: new Date('2026-01-15'),
      language: 'en',
    },
    create: {
      creatorProfileId: mariaCreator.id,
      slug: 'pasta-basics',
      title: 'Perfect Pasta at Home',
      subtitle: 'Fresh dough, classic sauces, and restaurant plating',
      description:
        'Master handmade pasta from scratch. Learn dough hydration, shaping techniques, and five signature sauces you can make on a weeknight.',
      thumbnailUrl: 'https://img.youtube.com/vi/8oC23E5GaU4/maxresdefault.jpg',
      trailerYoutubeId: '8oC23E5GaU4',
      status: CourseStatus.PUBLISHED,
      estimatedHours: 4.5,
      language: 'en',
      offersCertificate: true,
      certificatePaidAt: new Date('2026-01-15'),
      publishedAt: new Date('2026-01-15'),
      categories: {
        create: [{ categoryId: cooking.id }],
      },
      modules: {
        create: [
          {
            title: 'Pasta Foundations',
            description: 'Ingredients, tools, and dough basics.',
            sortOrder: 1,
            lessons: {
              create: [
                {
                  title: 'Choosing Flour and Eggs',
                  description: 'Why tipo 00 matters and how to source quality ingredients.',
                  youtubeVideoId: '8oC23E5GaU4',
                  youtubeUrl: 'https://www.youtube.com/watch?v=8oC23E5GaU4',
                  durationSeconds: 720,
                  sortOrder: 1,
                  status: LessonStatus.PUBLISHED,
                  resources: {
                    create: [
                      {
                        title: 'Ingredient Shopping List',
                        resourceType: LessonResourceType.PDF,
                        url: 'https://example.com/pasta-ingredients.pdf',
                        sortOrder: 1,
                      },
                    ],
                  },
                },
                {
                  title: 'Mixing and Kneading Dough',
                  description: 'The windowpane test and resting times explained.',
                  youtubeVideoId: 'rLQEMEsP6E4',
                  youtubeUrl: 'https://www.youtube.com/watch?v=rLQEMEsP6E4',
                  durationSeconds: 960,
                  sortOrder: 2,
                  status: LessonStatus.PUBLISHED,
                },
              ],
            },
          },
          {
            title: 'Shaping Techniques',
            description: 'Tagliatelle, ravioli, and gnocchi.',
            sortOrder: 2,
            lessons: {
              create: [
                {
                  title: 'Hand-Cut Tagliatelle',
                  youtubeVideoId: 'qC7ic1-aQq8',
                  youtubeUrl: 'https://www.youtube.com/watch?v=qC7ic1-aQq8',
                  durationSeconds: 840,
                  sortOrder: 1,
                  status: LessonStatus.PUBLISHED,
                },
                {
                  title: 'Ravioli Filling and Sealing',
                  youtubeVideoId: 'YvMhR3T_b5c',
                  youtubeUrl: 'https://www.youtube.com/watch?v=YvMhR3T_b5c',
                  durationSeconds: 1100,
                  sortOrder: 2,
                  status: LessonStatus.PUBLISHED,
                },
              ],
            },
          },
        ],
      },
    },
    include: {
      modules: { include: { lessons: true } },
    },
  });

  const guitarCourse = await prisma.course.upsert({
    where: { slug: 'guitar-fundamentals' },
    update: {
      offersCertificate: true,
      certificatePaidAt: new Date('2026-02-01'),
    },
    create: {
      creatorProfileId: devonCreator.id,
      slug: 'guitar-fundamentals',
      title: 'Acoustic Guitar Essentials',
      subtitle: 'Chords, rhythm, and your first performance',
      description:
        'A structured path from absolute beginner to playing full songs. No music theory degree required.',
      thumbnailUrl: 'https://img.youtube.com/vi/pfAlxwyi5Ug/maxresdefault.jpg',
      trailerYoutubeId: 'pfAlxwyi5Ug',
      status: CourseStatus.PUBLISHED,
      estimatedHours: 6.0,
      language: 'en',
      offersCertificate: true,
      certificatePaidAt: new Date('2026-02-01'),
      publishedAt: new Date('2026-02-01'),
      categories: {
        create: [{ categoryId: music.id }],
      },
      modules: {
        create: [
          {
            title: 'Getting Started',
            sortOrder: 1,
            lessons: {
              create: [
                {
                  title: 'Holding the Guitar and Picking',
                  youtubeVideoId: 'pfAlxwyi5Ug',
                  youtubeUrl: 'https://www.youtube.com/watch?v=pfAlxwyi5Ug',
                  durationSeconds: 600,
                  sortOrder: 1,
                  status: LessonStatus.PUBLISHED,
                },
                {
                  title: 'Your First Three Chords',
                  youtubeVideoId: 'p6xDH4ky4NY',
                  youtubeUrl: 'https://www.youtube.com/watch?v=p6xDH4ky4NY',
                  durationSeconds: 780,
                  sortOrder: 2,
                  status: LessonStatus.PUBLISHED,
                },
              ],
            },
          },
          {
            title: 'Rhythm and Strumming',
            sortOrder: 2,
            lessons: {
              create: [
                {
                  title: 'Down-Up Strumming Patterns',
                  youtubeVideoId: 'Ei6q5D6c_1Y',
                  youtubeUrl: 'https://www.youtube.com/watch?v=Ei6q5D6c_1Y',
                  durationSeconds: 900,
                  sortOrder: 1,
                  status: LessonStatus.PUBLISHED,
                },
              ],
            },
          },
        ],
      },
    },
  });

  await prisma.course.upsert({
    where: { slug: 'design-systems-101' },
    update: {
      offersCertificate: true,
      certificatePaidAt: new Date('2025-09-20'),
    },
    create: {
      creatorProfileId: devonCreator.id,
      slug: 'design-systems-101',
      title: 'Design Systems 101',
      subtitle: 'Ship cohesive products faster',
      description:
        'Tokens, components, and documentation patterns for scalable product design.',
      thumbnailUrl:
        'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&h=500&fit=crop',
      status: CourseStatus.PUBLISHED,
      estimatedHours: 5.0,
      language: 'en',
      offersCertificate: true,
      certificatePaidAt: new Date('2025-09-20'),
      publishedAt: new Date('2025-09-20'),
      categories: {
        create: [{ categoryId: business.id }],
      },
    },
  });

  await prisma.course.upsert({
    where: { slug: 'advanced-pasta' },
    update: {},
    create: {
      creatorProfileId: mariaCreator.id,
      slug: 'advanced-pasta',
      title: 'Advanced Pasta Shapes',
      subtitle: 'Hand-rolled specialties from Italy',
      description:
        'Master orecchiette, tortellini, and stuffed pastas with pro techniques.',
      thumbnailUrl:
        'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=800&h=500&fit=crop',
      status: CourseStatus.PUBLISHED,
      estimatedHours: 4.0,
      language: 'es',
      publishedAt: new Date('2026-06-28'),
      categories: {
        create: [{ categoryId: cooking.id }],
      },
    },
  });

  await prisma.course.upsert({
    where: { slug: 'strength-basics-30-days' },
    update: {},
    create: {
      creatorProfileId: mariaCreator.id,
      slug: 'strength-basics-30-days',
      title: 'Strength Basics: 30 Days',
      subtitle: 'Build a sustainable home workout habit',
      description:
        'A beginner-friendly strength program using minimal equipment. Three sessions per week.',
      status: CourseStatus.DRAFT,
      estimatedHours: 3.0,
      categories: {
        create: [{ categoryId: fitness.id }, { categoryId: business.id }],
      },
      modules: {
        create: [
          {
            title: 'Week 1 — Movement Prep',
            sortOrder: 1,
            lessons: {
              create: [
                {
                  title: 'Warm-Up Routine',
                  youtubeVideoId: 'g_tea8ZNkv4',
                  youtubeUrl: 'https://www.youtube.com/watch?v=g_tea8ZNkv4',
                  durationSeconds: 480,
                  sortOrder: 1,
                  status: LessonStatus.DRAFT,
                },
              ],
            },
          },
        ],
      },
    },
  });

  // ---------------------------------------------------------------------------
  // Access plans (creators define multiple plans per course)
  // ---------------------------------------------------------------------------
  const pastaLifetime = await prisma.accessPlan.upsert({
    where: { id: 'seed_pasta_lifetime' },
    update: {},
    create: {
      id: 'seed_pasta_lifetime',
      courseId: pastaCourse.id,
      name: 'Lifetime Access',
      description: 'One-time purchase. Watch forever.',
      planType: AccessPlanType.ONE_TIME,
      priceCents: 7900,
      currency: 'USD',
      isActive: true,
      sortOrder: 1,
      features: {
        create: [
          { key: 'lifetime_access', label: 'Lifetime course access', sortOrder: 1 },
          { key: 'downloadable_resources', label: 'Downloadable lesson resources', sortOrder: 2 },
          { key: 'future_updates', label: 'Free content updates', sortOrder: 3 },
        ],
      },
    },
  });

  const pastaMonthly = await prisma.accessPlan.upsert({
    where: { id: 'seed_pasta_monthly' },
    update: {},
    create: {
      id: 'seed_pasta_monthly',
      courseId: pastaCourse.id,
      name: 'Monthly Access',
      description: 'Subscribe monthly. Cancel anytime.',
      planType: AccessPlanType.SUBSCRIPTION,
      priceCents: 1499,
      currency: 'USD',
      billingInterval: BillingInterval.MONTHLY,
      isActive: true,
      sortOrder: 2,
      features: {
        create: [
          { key: 'streaming_access', label: 'Stream all lessons while subscribed', sortOrder: 1 },
          { key: 'downloadable_resources', label: 'Downloadable lesson resources', sortOrder: 2 },
        ],
      },
    },
  });

  await prisma.accessPlan.upsert({
    where: { id: 'seed_pasta_weekly' },
    update: {},
    create: {
      id: 'seed_pasta_weekly',
      courseId: pastaCourse.id,
      name: 'Weekly Access',
      description: 'Subscribe weekly. Cancel anytime.',
      planType: AccessPlanType.SUBSCRIPTION,
      priceCents: 499,
      currency: 'USD',
      billingInterval: BillingInterval.WEEKLY,
      isActive: true,
      sortOrder: 3,
      features: {
        create: [
          { key: 'streaming_access', label: 'Stream all lessons while subscribed', sortOrder: 1 },
          { key: 'downloadable_resources', label: 'Downloadable lesson resources', sortOrder: 2 },
        ],
      },
    },
  });

  await prisma.accessPlan.upsert({
    where: { id: 'seed_pasta_yearly' },
    update: {},
    create: {
      id: 'seed_pasta_yearly',
      courseId: pastaCourse.id,
      name: 'Yearly Access',
      description: 'Best value — billed annually.',
      planType: AccessPlanType.SUBSCRIPTION,
      priceCents: 14900,
      currency: 'USD',
      billingInterval: BillingInterval.YEARLY,
      isActive: true,
      sortOrder: 4,
      features: {
        create: [
          { key: 'streaming_access', label: 'Stream all lessons while subscribed', sortOrder: 1 },
          { key: 'downloadable_resources', label: 'Downloadable lesson resources', sortOrder: 2 },
          { key: 'priority_updates', label: 'Priority content updates', sortOrder: 3 },
        ],
      },
    },
  });

  void pastaMonthly;

  await prisma.accessPlan.upsert({
    where: { id: 'seed_guitar_lifetime' },
    update: {},
    create: {
      id: 'seed_guitar_lifetime',
      courseId: guitarCourse.id,
      name: 'Lifetime Access',
      planType: AccessPlanType.ONE_TIME,
      priceCents: 9900,
      currency: 'USD',
      isActive: true,
      sortOrder: 1,
      features: {
        create: [
          { key: 'lifetime_access', label: 'Lifetime course access', sortOrder: 1 },
          { key: 'practice_tracks', label: 'Bonus practice play-alongs', sortOrder: 2 },
        ],
      },
    },
  });

  await prisma.accessPlan.upsert({
    where: { id: 'seed_guitar_free' },
    update: {},
    create: {
      id: 'seed_guitar_free',
      courseId: guitarCourse.id,
      name: 'Free Preview',
      description: 'Access preview lessons at no cost.',
      planType: AccessPlanType.FREE,
      priceCents: 0,
      currency: 'USD',
      isActive: true,
      sortOrder: 0,
      features: {
        create: [{ key: 'preview_lessons', label: 'Preview lessons only', sortOrder: 1 }],
      },
    },
  });

  // ---------------------------------------------------------------------------
  // Sample purchase, payment, and granted course access
  // ---------------------------------------------------------------------------
  const existingPurchase = await prisma.userPurchase.findFirst({
    where: { userId: learner.id, courseId: pastaCourse.id },
  });

  if (!existingPurchase) {
    let payment = await prisma.payment.findFirst({
      where: { stripePaymentIntentId: 'pi_seed_pasta_purchase_001' },
    });
    if (!payment) {
      payment = await prisma.payment.create({
        data: {
          userId: learner.id,
          status: PaymentStatus.SUCCEEDED,
          amountCents: pastaLifetime.priceCents,
          currency: 'USD',
          stripePaymentIntentId: 'pi_seed_pasta_purchase_001',
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
          courseId: pastaCourse.id,
          accessPlanId: pastaLifetime.id,
          paymentId: payment.id,
          status: PurchaseStatus.COMPLETED,
          amountCents: pastaLifetime.priceCents,
          currency: 'USD',
          purchasedAt: new Date('2026-03-01'),
        },
      });

      await prisma.courseAccess.create({
        data: {
          userId: learner.id,
          courseId: pastaCourse.id,
          accessPlanId: pastaLifetime.id,
          userPurchaseId: purchase.id,
          startsAt: new Date('2026-03-01'),
        },
      });

      await prisma.notification.create({
        data: {
          userId: learner.id,
          type: NotificationType.PURCHASE_CONFIRMED,
          title: 'Purchase confirmed',
          body: `You now have lifetime access to "${pastaCourse.title}".`,
          data: { courseId: pastaCourse.id, accessPlanId: pastaLifetime.id },
          readAt: new Date('2026-03-01'),
        },
      });
    }
  }

  // Sample active subscription for second learner
  const existingSubscription = await prisma.userSubscription.findFirst({
    where: { userId: learner2.id, accessPlanId: pastaMonthly.id },
  });

  if (!existingSubscription) {
    const periodStart = new Date();
    periodStart.setDate(1);
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const subscription = await prisma.userSubscription.create({
      data: {
        userId: learner2.id,
        accessPlanId: pastaMonthly.id,
        status: SubscriptionStatus.ACTIVE,
        stripeSubscriptionId: 'sub_seed_pasta_monthly_001',
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      },
    });

    await prisma.courseAccess.create({
      data: {
        userId: learner2.id,
        courseId: pastaCourse.id,
        accessPlanId: pastaMonthly.id,
        userSubscriptionId: subscription.id,
        startsAt: periodStart,
        expiresAt: periodEnd,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Engagement samples
  // ---------------------------------------------------------------------------
  await prisma.review.upsert({
    where: {
      userId_courseId: { userId: learner.id, courseId: pastaCourse.id },
    },
    update: {},
    create: {
      userId: learner.id,
      courseId: pastaCourse.id,
      rating: 5,
      title: 'Finally made pasta worth serving to guests',
      body: 'Clear steps, no fluff. The ravioli lesson alone was worth the price.',
    },
  });

  await prisma.favorite.upsert({
    where: {
      userId_courseId: { userId: learner.id, courseId: pastaCourse.id },
    },
    update: {},
    create: {
      userId: learner.id,
      courseId: pastaCourse.id,
    },
  });

  await prisma.favorite.upsert({
    where: {
      userId_courseId: { userId: learner2.id, courseId: guitarCourse.id },
    },
    update: {},
    create: {
      userId: learner2.id,
      courseId: guitarCourse.id,
    },
  });

  const previewLesson = pastaCourse.modules[0]?.lessons[0];
  if (previewLesson) {
    const existingComment = await prisma.comment.findFirst({
      where: { userId: learner.id, lessonId: previewLesson.id },
    });

    if (!existingComment) {
      await prisma.comment.create({
        data: {
          userId: learner.id,
          lessonId: previewLesson.id,
          body: 'Great explanation of flour types — answered exactly what I was wondering.',
        },
      });
    }
  }

  console.log('Seed complete.');
  console.log(`  Users:           4 (2 learners, 2 creators)`);
  console.log(`  Creator profiles: 2`);
  console.log(`  Courses:         3`);
  console.log(`  Access plans:    4`);
  console.log(`  Categories:      4`);
  console.log('');
  console.log(`Sample accounts (password: ${DEV_PASSWORD}, stored as bcrypt hashes):`);
  console.log('  alex@example.com    — learner with lifetime pasta access');
  console.log('  jordan@example.com  — learner with monthly pasta subscription');
  console.log('  maria@example.com   — creator (Chef Maria Santos)');
  console.log('  devon@example.com   — creator (Devon Brooks)');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
