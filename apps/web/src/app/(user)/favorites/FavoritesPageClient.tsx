'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CourseCard, EmptyState } from '@/components';
import { useAuthSession } from '@/hooks/useAuthSession';
import { useFavorites } from '@/hooks/useFavorites';
import { listMyFavorites, type FavoriteItem } from '@/lib/api/favorites';
import { getCourseBySlug, type MockCourse } from '@/lib/mock-data';

function favoriteToMockCourse(favorite: FavoriteItem): MockCourse {
  const mock = getCourseBySlug(favorite.course.slug);

  if (mock) {
    return mock;
  }

  return {
    id: favorite.courseId,
    slug: favorite.course.slug,
    title: favorite.course.title,
    subtitle: favorite.course.subtitle ?? '',
    description: favorite.course.subtitle ?? '',
    thumbnailUrl:
      favorite.course.thumbnailUrl ??
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=500&fit=crop',
    creator: {
      id: favorite.course.creator.slug,
      handle: favorite.course.creator.slug,
      displayName: favorite.course.creator.displayName,
      headline: '',
      bio: '',
      avatarUrl:
        favorite.course.creator.avatarUrl ??
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop',
      courseCount: 1,
      studentCount: 0,
      rating: 0,
    },
    rating: 0,
    reviewCount: 0,
    lessonCount: 0,
    durationHours: 0,
    level: 'Beginner',
    category: 'Course',
    priceFromCents: 0,
    publishedAt: favorite.createdAt,
    language: favorite.course.language,
  };
}

export function FavoritesPageClient() {
  const { isAuthenticated, isLoading: authLoading } = useAuthSession();
  const { favoriteSlugs, isLoading: favoritesLoading } = useFavorites();
  const [courses, setCourses] = useState<MockCourse[]>([]);
  const [coursesReady, setCoursesReady] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let cancelled = false;

    async function loadCourses() {
      try {
        const items = await listMyFavorites();
        if (!cancelled) {
          setCourses(items.map(favoriteToMockCourse));
        }
      } catch {
        if (!cancelled) {
          setCourses([]);
        }
      } finally {
        if (!cancelled) {
          setCoursesReady(true);
        }
      }
    }

    void loadCourses();

    return () => {
      cancelled = true;
    };
  }, [favoriteSlugs, isAuthenticated]);

  const isLoading = authLoading || favoritesLoading || (isAuthenticated && !coursesReady);
  const needsSignIn = !authLoading && !isAuthenticated;

  const content = useMemo(() => {
    if (isLoading) {
      return <p className="mt-8 text-sm text-muted-foreground">Loading…</p>;
    }

    if (needsSignIn) {
      return (
        <EmptyState
          className="mt-8"
          title="Sign in to see favorites"
          description="Save courses from Explore and they will appear here."
          icon="♡"
          action={
            <Link
              href="/login?next=/favorites"
              className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background"
            >
              Sign in
            </Link>
          }
        />
      );
    }

    if (courses.length === 0) {
      return (
        <EmptyState
          className="mt-8"
          title="No favorites yet"
          description="Tap the heart on any course in Explore to save it here."
          icon="♡"
          action={
            <Link
              href="/discover"
              className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background"
            >
              Discover courses
            </Link>
          }
        />
      );
    }

    return (
      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        {courses.map((course) => (
          <CourseCard key={course.slug} course={course} />
        ))}
      </div>
    );
  }, [courses, isLoading, needsSignIn]);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Favorites
      </h1>
      <p className="mt-1 text-muted-foreground">
        Courses you&apos;ve saved for later
      </p>
      {content}
    </div>
  );
}
