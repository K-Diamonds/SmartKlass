'use client';

import { useEffect, useState } from 'react';
import { CourseCard, ContinueLearningCard } from '@/components';
import { useAuthSession } from '@/hooks/useAuthSession';
import { listPublishedCourses } from '@/lib/api/courses';
import { summaryToDisplayCourse } from '@/lib/catalog/course-display';
import { listMySubscriptions } from '@/lib/api/subscriptions';
import { getMyLibrary } from '@/lib/api/users';
import { mockCourses } from '@/lib/mock-data';
import type { MockCourse } from '@/lib/mock-data';

const ACTIVE_STATUSES = new Set(['ACTIVE', 'TRIALING']);

export function DashboardPageClient() {
  const { isAuthenticated, isLoading: authLoading } = useAuthSession();
  const [libraryCount, setLibraryCount] = useState(0);
  const [subscriptionCount, setSubscriptionCount] = useState(0);
  const [ready, setReady] = useState(false);
  const [recommended, setRecommended] = useState<MockCourse[]>(mockCourses.slice(1, 3));

  useEffect(() => {
    if (!isAuthenticated) {
      setLibraryCount(0);
      setSubscriptionCount(0);
      setReady(true);
      return;
    }

    let cancelled = false;

    async function loadStats() {
      try {
        const [library, subscriptions] = await Promise.all([
          getMyLibrary(),
          listMySubscriptions(),
        ]);

        if (cancelled) {
          return;
        }

        setLibraryCount(library.length);
        setSubscriptionCount(
          subscriptions.filter((subscription) => ACTIVE_STATUSES.has(subscription.status))
            .length,
        );
      } catch {
        if (!cancelled) {
          setLibraryCount(0);
          setSubscriptionCount(0);
        }
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    }

    void loadStats();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    let cancelled = false;
    void listPublishedCourses({ limit: 4 })
      .then((result) => {
        if (!cancelled && result.items.length > 0) {
          setRecommended(result.items.slice(0, 2).map((c) => summaryToDisplayCourse(c)));
        }
      })
      .catch(() => {
        // Keep mock recommendations when API is unavailable.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = [
    { label: 'Courses in library', value: String(libraryCount) },
    { label: 'Hours watched', value: '0' },
    { label: 'Active subscriptions', value: String(subscriptionCount) },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
      <p className="mt-1 text-muted-foreground">Pick up where you left off</p>

      <div className="mt-8">
        <ContinueLearningCard />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border-subtle bg-surface p-5"
          >
            <p className="text-2xl font-semibold text-foreground">
              {authLoading || !ready ? '…' : stat.value}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      <section className="mt-12">
        <h2 className="text-lg font-semibold text-foreground">Recommended for you</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {recommended.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      </section>
    </div>
  );
}
