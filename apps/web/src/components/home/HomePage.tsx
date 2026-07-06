'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Suspense, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  Check,
  ChevronDown,
  Clock,
  Menu,
  Play,
  Search,
  Sparkles,
  Star,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { APP_NAME } from '@smartklass/shared';
import { CatalogNav } from '@/components/catalog/CatalogNav';
import { CourseImageBadge } from '@/components/course/CourseImageBadge';
import { CourseLanguageBadge } from '@/components/course/CourseLanguageBadge';
import { FavoriteButton } from '@/components/course/FavoriteButton';
import { PublicNavActions } from '@/components/layout/PublicNavActions';
import { getCreatorStudioLabel, useAuthSession } from '@/hooks/useAuthSession';
import { coursePublicUrl } from '@/lib/courses';
import { discoverCreatorUrl } from '@/lib/discover';
import { compareTrendingCourses } from '@/lib/catalog/catalog-utils';
import { listPublishedCourses } from '@/lib/api/courses';
import { listCreatorDirectory } from '@/lib/api/creators';
import { summaryToDisplayCourse } from '@/lib/catalog/course-display';
import type { CourseDisplay, CreatorDisplay } from '@/lib/catalog/display-types';
import { formatCoursePrice } from '@/lib/utils';

const CATEGORIES = ['All', 'Culinary', 'Music', 'Design', 'Business'];

const TESTIMONIALS = [
  {
    quote:
      'SmartKlass completely changed how I approach learning. The quality of creators here is unmatched — I went from zero to landing my first client in under 3 months.',
    name: 'Amara Diallo',
    role: 'Freelance Brand Designer',
    avatar:
      'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=80&h=80&fit=crop&auto=format',
  },
  {
    quote:
      'The platform handles everything — payments, subscriptions, analytics. I focus entirely on creating. My MRR grew 400% in 6 months without writing a single line of code.',
    name: 'Rafael Torres',
    role: 'Photography Educator & Creator',
    avatar:
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&h=80&fit=crop&auto=format',
  },
  {
    quote:
      'I was a learner for a year, then activated Creator Mode. Now I have 3,200 active subscribers. It\'s my full-time income. SmartKlass made that possible.',
    name: 'Sophie Laurent',
    role: 'UX Design Instructor',
    avatar:
      'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=80&h=80&fit=crop&auto=format',
  },
];

const FAQS = [
  {
    q: 'What is SmartKlass?',
    a: 'SmartKlass is a premium learning marketplace where world-class creators teach what they know and love. Browse courses across culinary, music, design, business, and more — or enable Creator Mode and share your own expertise.',
  },
  {
    q: 'How does Creator Mode work?',
    a: 'Every SmartKlass account includes Creator Mode. Toggle it on from your dashboard to access the Course Builder, analytics, subscription plan management, and payment tools. No separate account needed.',
  },
  {
    q: 'Do I need to upload videos?',
    a: 'No. SmartKlass does not host video files. Creators paste a YouTube URL for each lesson. The platform embeds the player on protected pages.',
  },
  {
    q: 'How does creator revenue work?',
    a: 'Publishing is free. You set weekly, monthly, yearly, or lifetime subscriber pricing in Creator Studio. SmartKlass collects 20% per payment or $5 minimum — whichever is higher — and pays you the rest via Stripe.',
  },
  {
    q: 'Can I cancel my subscription anytime?',
    a: 'Yes. Cancel from billing settings with one click. You keep access through the end of your billing period.',
  },
];

function fmtCount(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}

function LogoMark({ dark = false }: { dark?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent">
        <BookOpen size={15} className="text-accent-foreground" />
      </div>
      <span
        className={`font-display text-lg font-semibold tracking-tight ${dark ? 'text-white' : 'text-foreground'}`}
      >
        {APP_NAME}
      </span>
    </div>
  );
}

function HomeNav({
  scrolled,
  menuOpen,
  setMenuOpen,
}: {
  scrolled: boolean;
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
}) {
  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
      style={{
        backgroundColor: scrolled ? 'rgba(12,12,10,0.94)' : 'transparent',
        backdropFilter: scrolled ? 'blur(18px)' : 'none',
      }}
    >
      <div className="relative mx-auto flex h-auto min-h-16 max-w-7xl flex-col gap-3 overflow-visible px-6 py-3 lg:h-16 lg:flex-row lg:items-center lg:justify-between lg:gap-6 lg:px-10 lg:py-0">
        <Link href="/" className="shrink-0">
          <LogoMark dark />
        </Link>

        <Suspense fallback={null}>
          <CatalogNav variant="dark" className="min-w-0 flex-1 justify-center" />
        </Suspense>

        <div className="hidden items-center gap-3 lg:flex">
          <PublicNavActions variant="dark" />
        </div>

        <button
          type="button"
          className="absolute right-6 top-3 p-2 text-white/70 transition-colors hover:text-white lg:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {menuOpen && (
        <div
          className="border-t lg:hidden"
          style={{
            backgroundColor: 'rgba(12,12,10,0.98)',
            borderColor: 'rgba(255,255,255,0.08)',
          }}
        >
          <div className="flex flex-col gap-4 px-6 py-5">
            <PublicNavActions variant="dark" layout="mobile" />
          </div>
        </div>
      )}
    </nav>
  );
}

function CarouselCourseCard({
  course,
}: {
  course: CourseDisplay;
}) {
  return (
    <Link
      href={coursePublicUrl(course.id)}
      className="group w-72 shrink-0 overflow-hidden rounded-3xl bg-surface shadow-card transition-all duration-300 hover:-translate-y-1"
    >
      <div className="relative h-44 overflow-hidden bg-muted">
        <Image
          src={course.thumbnailUrl}
          alt={course.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="288px"
        />
        <div className="absolute inset-0 bg-black/20 transition-colors duration-300 group-hover:bg-black/30" />
        <CourseImageBadge offersCertificate={Boolean(course.offersCertificate)} />
        <FavoriteButton courseSlug={course.slug} />
        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          <Image
            src={course.creator.avatarUrl}
            alt={course.creator.displayName}
            width={24}
            height={24}
            className="rounded-full border-2 border-white object-cover"
          />
          <span className="text-xs font-medium text-white drop-shadow">
            {course.creator.displayName}
          </span>
        </div>
      </div>
      <div className="p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
            <span>{course.category}</span>
            <span>·</span>
            <span>{course.level}</span>
          </div>
          <span className="shrink-0 rounded-full bg-dark/75 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
            <CourseLanguageBadge language={course.language} />
          </span>
        </div>
        <h3 className="mb-2.5 line-clamp-2 text-sm font-semibold leading-snug text-foreground">
          {course.title}
        </h3>
        <div className="mb-3 flex items-center gap-1.5">
          <Star size={11} fill="var(--gold)" color="var(--gold)" />
          <span className="text-xs font-semibold text-foreground">{course.rating}</span>
          <span className="text-xs text-muted-foreground">
            ({fmtCount(course.reviewCount)})
          </span>
          <span className="mx-0.5 text-xs text-muted-foreground">·</span>
          <Users size={10} className="text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {fmtCount(course.viewerCount)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock size={10} />
            <span>{course.durationHours}h</span>
            <span>·</span>
            <span>{course.lessonCount} lessons</span>
          </div>
          <span className="text-sm font-bold text-foreground">
            {formatCoursePrice({
              priceCents: course.priceFromCents,
              billingInterval: course.billingInterval ?? 'lifetime',
              hasMultiplePlans: course.hasMultiplePlans ?? false,
              compact: true,
            })}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function HomePage() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [catalogCourses, setCatalogCourses] = useState<CourseDisplay[]>([]);
  const [topCreators, setTopCreators] = useState<CreatorDisplay[]>([]);
  const { isCreator, creatorCourseCount } = useAuthSession();

  const creatorCtaLabel = getCreatorStudioLabel(
    { isCreator, creatorCourseCount },
    {
      becomeCreator: 'Become a Creator',
      openCreatorStudio: 'Open Creator Studio',
      creatorDashboard: 'Creator Dashboard',
    },
  );

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void listPublishedCourses({ limit: 24 })
      .then((result) => {
        if (!cancelled) {
          setCatalogCourses(result.items.map((c) => summaryToDisplayCourse(c)));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCatalogCourses([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void listCreatorDirectory()
      .then((creators) => {
        if (!cancelled) {
          setTopCreators(
            creators.slice(0, 6).map((creator) => ({
              id: creator.slug,
              handle: creator.slug,
              displayName: creator.displayName,
              headline: '',
              bio: '',
              avatarUrl:
                creator.avatarUrl ??
                'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop',
              courseCount: creator.courseCount,
              studentCount: 0,
              rating: 0,
            })),
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTopCreators([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const trendingCourses = useMemo(() => {
    const pool =
      activeCategory === 'All'
        ? catalogCourses
        : catalogCourses.filter((course) => course.category === activeCategory);

    return [...pool].sort(compareTrendingCourses);
  }, [activeCategory, catalogCourses]);

  return (
    <div>
      <HomeNav scrolled={scrolled} menuOpen={menuOpen} setMenuOpen={setMenuOpen} />

      {/* Hero */}
      <section className="relative flex min-h-screen items-center overflow-hidden bg-dark">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1600&h=900&fit=crop&auto=format"
            alt="Creators and learners collaborating"
            fill
            className="object-cover opacity-[0.18]"
            priority
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(135deg, #0C0C0A 45%, rgba(12,12,10,0.6) 100%)',
            }}
          />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-20 pt-28 lg:px-10">
          <div className="max-w-3xl">
            <div
              className="mb-8 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium"
              style={{
                borderColor: 'rgba(196,154,60,0.35)',
                color: 'var(--gold)',
                backgroundColor: 'rgba(196,154,60,0.07)',
              }}
            >
              <Sparkles size={13} />
              The next-generation learning marketplace
            </div>

            <h1 className="font-display mb-6 text-5xl font-semibold leading-[1.08] text-white sm:text-6xl lg:text-[72px]">
              Learn from the
              <br />
              world&apos;s best.
              <br />
              <span className="text-accent">Teach what you love.</span>
            </h1>

            <p
              className="mb-10 max-w-lg text-lg leading-relaxed"
              style={{ color: 'rgba(255,255,255,0.52)' }}
            >
              {APP_NAME} the openness of
              open learning, and the flexibility creators need — in one premium
              platform built for creators and learners alike.
            </p>

            <div className="mb-16 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/discover"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-8 py-4 text-base font-semibold text-accent-foreground transition-all duration-200 hover:scale-105 hover:opacity-95"
              >
                Start Learning
              </Link>
              <Link
                href="/discover"
                className="inline-flex items-center justify-center gap-2 rounded-full border px-8 py-4 text-base font-semibold text-white transition-all duration-200 hover:bg-white/8"
                style={{ borderColor: 'rgba(255,255,255,0.18)' }}
              >
                Explore Courses
                <ArrowRight size={17} />
              </Link>
            </div>

            <div className="flex flex-wrap gap-x-10 gap-y-4">
              {[
                { label: 'Active Learners', value: '52,000+' },
                { label: 'Expert Courses', value: '2,400+' },
                { label: 'Top Creators', value: '640+' },
                { label: 'Avg. Rating', value: '4.9 ★' },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="font-display text-2xl font-bold text-white">
                    {stat.value}
                  </div>
                  <div className="mt-0.5 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Courses */}
      <section className="bg-cream py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="mb-12 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent">
                Trending Now
              </p>
              <h2 className="font-display text-4xl font-semibold leading-tight text-foreground">
                Explore top courses
              </h2>
            </div>
            <Link
              href="/discover"
              className="flex items-center gap-2 text-sm font-semibold text-foreground transition-all duration-200 hover:gap-3"
            >
              View all <ArrowRight size={15} />
            </Link>
          </div>

          <div className="scrollbar-hide mb-8 flex gap-2 overflow-x-auto pb-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className="shrink-0 rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-200"
                style={{
                  backgroundColor:
                    activeCategory === cat ? '#111110' : 'rgba(17,17,16,0.07)',
                  color: activeCategory === cat ? '#F6F3EE' : '#7A766F',
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="scrollbar-hide -mx-6 flex gap-5 overflow-x-auto px-6 pb-4">
            {trendingCourses.map((course) => (
              <CarouselCourseCard key={course.id} course={course} />
            ))}
          </div>
        </div>
      </section>

      {/* Creators */}
      <section className="bg-dark py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="mb-12 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent">
                World-Class Instructors
              </p>
              <h2 className="font-display text-4xl font-semibold leading-tight text-white">
                Meet the creators
              </h2>
            </div>
            <Link
              href="/discover"
              className="flex items-center gap-2 text-sm font-semibold transition-all duration-200 hover:gap-3 hover:text-white"
              style={{ color: 'rgba(255,255,255,0.5)' }}
            >
              All creators <ArrowRight size={15} />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {topCreators.map((creator) => (
              <Link
                key={creator.id}
                href={discoverCreatorUrl(creator.handle)}
                className="group overflow-hidden rounded-3xl bg-[#161614] shadow-elevated transition-all duration-300 hover:-translate-y-1"
              >
                <div className="relative h-32 overflow-hidden bg-zinc-800">
                  <Image
                    src={creator.avatarUrl}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 100vw, 400px"
                    className="object-cover opacity-50 transition-transform duration-500 group-hover:scale-105"
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        'linear-gradient(to bottom, transparent 40%, #161614)',
                    }}
                  />
                </div>
                <div className="relative -mt-8 px-5 pb-5">
                  <Image
                    src={creator.avatarUrl}
                    alt={creator.displayName}
                    width={64}
                    height={64}
                    className="mb-3 rounded-2xl border-2 border-accent object-cover"
                  />
                  <h3 className="font-display mb-0.5 font-semibold text-white">
                    {creator.displayName}
                  </h3>
                  <p className="mb-4 text-xs text-muted-foreground">{creator.headline}</p>
                  <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{creator.courseCount} courses</span>
                    <span>{fmtCount(creator.studentCount)} students</span>
                    <span className="flex items-center gap-1">
                      <Star size={10} fill="var(--gold)" color="var(--gold)" />
                      {creator.rating}
                    </span>
                  </div>
                  <span className="block w-full rounded-full bg-accent py-2.5 text-center text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90">
                    View profile
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-cream py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="mb-16 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent">
              Simple by Design
            </p>
            <h2 className="font-display text-4xl font-semibold text-foreground">
              How SmartKlass works
            </h2>
          </div>

          <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
            {[
              {
                label: 'For Learners',
                accent: false,
                steps: [
                  {
                    Icon: Search,
                    title: 'Browse & Discover',
                    body: 'Explore courses across culinary, music, design, business, and more.',
                  },
                  {
                    Icon: Play,
                    title: 'Learn at Your Pace',
                    body: 'Watch lessons, download resources, and pick up where you left off.',
                  },
                  {
                    Icon: Award,
                    title: 'Earn Certificates',
                    body: 'Complete courses and showcase your skills on LinkedIn or your portfolio.',
                  },
                ],
              },
              {
                label: 'For Creators',
                accent: true,
                steps: [
                  {
                    Icon: Zap,
                    title: 'Enable Creator Mode',
                    body: 'Toggle Creator Mode from your dashboard — same account, full toolkit.',
                  },
                  {
                    Icon: BookOpen,
                    title: 'Build Your Course',
                    body: 'Drag-and-drop builder. Paste YouTube URLs, add resources, then set subscriber pricing.',
                  },
                  {
                    Icon: BarChart3,
                    title: 'Grow & Earn',
                    body: 'Set your subscriber price in Studio. SmartKlass keeps 20% or $5 minimum per subscriber — you earn the rest.',
                  },
                ],
              },
            ].map(({ label, accent, steps }) => (
              <div key={label}>
                <div
                  className="mb-8 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold"
                  style={{
                    backgroundColor: accent ? 'var(--gold)' : '#111110',
                    color: accent ? '#0C0C0A' : '#F6F3EE',
                  }}
                >
                  {accent ? <Sparkles size={13} /> : <BookOpen size={13} />}
                  {label}
                </div>
                <div className="flex flex-col gap-8">
                  {steps.map(({ Icon, title, body }) => (
                    <div key={title} className="flex gap-5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent-muted text-accent">
                        <Icon size={18} />
                      </div>
                      <div>
                        <h3 className="mb-1 text-sm font-semibold text-foreground">{title}</h3>
                        <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-cream py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="mb-16 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent">
              Real Stories
            </p>
            <h2 className="font-display text-4xl font-semibold text-foreground">
              What people are saying
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {TESTIMONIALS.map((item) => (
              <div
                key={item.name}
                className="flex flex-col rounded-3xl bg-surface p-8 shadow-soft"
              >
                <div className="mb-5 flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star key={index} size={13} fill="var(--gold)" color="var(--gold)" />
                  ))}
                </div>
                <p className="mb-6 flex-1 text-sm leading-relaxed text-[#4A4744]">
                  &ldquo;{item.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <Image
                    src={item.avatar}
                    alt={item.name}
                    width={40}
                    height={40}
                    className="rounded-full object-cover"
                  />
                  <div>
                    <div className="text-sm font-semibold text-foreground">{item.name}</div>
                    <div className="text-xs text-muted-foreground">{item.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Creator CTA */}
      <section className="relative overflow-hidden bg-dark py-24">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=1400&h=700&fit=crop&auto=format"
            alt=""
            fill
            className="object-cover opacity-[0.09]"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse at 25% 60%, rgba(196,154,60,0.07) 0%, transparent 65%)',
            }}
          />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-10">
          <div className="max-w-2xl">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-accent">
              Creator Economy
            </p>
            <h2 className="font-display mb-6 text-5xl font-semibold leading-tight text-white">
              Your knowledge is worth more than you think.
            </h2>
            <p
              className="mb-8 text-base leading-relaxed"
              style={{ color: 'rgba(255,255,255,0.48)' }}
            >
              Enable Creator Mode and start publishing courses for free. Set your
              subscriber price in Studio, manage learners, and earn recurring revenue
              after SmartKlass&apos;s platform fee.
            </p>
            <div className="mb-10 flex flex-wrap gap-x-6 gap-y-3">
              {[
                'Publish courses for free',
                'Set your own subscriber price',
                '20% or $5 min platform fee',
                'Stripe-powered checkout',
                'No video upload required',
                'Real-time analytics',
              ].map((feature) => (
                <div
                  key={feature}
                  className="flex items-center gap-2 text-sm"
                  style={{ color: 'rgba(255,255,255,0.6)' }}
                >
                  <Check size={13} className="text-accent" />
                  {feature}
                </div>
              ))}
            </div>
            <Link
              href="/studio"
              className="inline-flex items-center gap-2 rounded-full bg-accent px-8 py-4 text-base font-semibold text-accent-foreground transition-all duration-200 hover:scale-105 hover:opacity-95"
            >
              {creatorCtaLabel}
              <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-cream py-24">
        <div className="mx-auto max-w-2xl px-6">
          <div className="mb-12 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent">
              Got Questions?
            </p>
            <h2 className="font-display text-4xl font-semibold text-foreground">
              Frequently asked
            </h2>
          </div>
          <div className="flex flex-col gap-2">
            {FAQS.map((faq, index) => (
              <div key={faq.q} className="overflow-hidden rounded-2xl bg-surface">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                >
                  <span className="text-sm font-medium text-foreground">{faq.q}</span>
                  <ChevronDown
                    size={15}
                    className="shrink-0 text-muted-foreground transition-transform duration-200"
                    style={{
                      transform: openFaq === index ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}
                  />
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-5">
                    <p className="text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
