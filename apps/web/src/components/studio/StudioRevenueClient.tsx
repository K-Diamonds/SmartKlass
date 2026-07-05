'use client';

import { useEffect, useMemo, useState } from 'react';
import { StudioPageHeader, StudioStatCard } from '@/components/studio/StudioPageHeader';
import { listMyCourses, type CreatorCourseListItem } from '@/lib/api/courses';
import { getCreatorWallet } from '@/lib/api/billing';
import type { StudioRevenuePoint } from '@/lib/studio/types';
import { formatPrice } from '@/lib/utils';

function buildRecentRevenueHistory(): StudioRevenuePoint[] {
  const now = new Date();

  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);

    return {
      month: date.toLocaleString('en-US', { month: 'short' }),
      revenueCents: 0,
      purchases: 0,
      subscriptions: 0,
    };
  });
}

export function StudioRevenueClient() {
  const [courses, setCourses] = useState<CreatorCourseListItem[]>([]);
  const [totalRevenueCents, setTotalRevenueCents] = useState(0);
  const [ready, setReady] = useState(false);

  const revenueHistory = useMemo(() => buildRecentRevenueHistory(), []);
  const latest = revenueHistory[revenueHistory.length - 1];
  const previous = revenueHistory[revenueHistory.length - 2];
  const growth =
    previous.revenueCents > 0
      ? Math.round(
          ((latest.revenueCents - previous.revenueCents) / previous.revenueCents) *
            100,
        )
      : 0;
  const chartMax = Math.max(...revenueHistory.map((point) => point.revenueCents), 1);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [wallet, courseItems] = await Promise.all([
          getCreatorWallet(),
          listMyCourses(),
        ]);

        if (!cancelled) {
          setTotalRevenueCents(
            wallet.availableBalanceCents + wallet.withdrawnBalanceCents,
          );
          setCourses(Array.isArray(courseItems) ? courseItems : []);
        }
      } catch {
        if (!cancelled) {
          setTotalRevenueCents(0);
          setCourses([]);
        }
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-8">
      <StudioPageHeader
        eyebrow="Monetization"
        title="Revenue"
        description="Earnings after SmartKlass platform fees (20% or $5 minimum per subscriber)."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StudioStatCard
          label="All-time revenue"
          value={ready ? formatPrice(totalRevenueCents) : '…'}
          change="Across all courses"
          trend="neutral"
        />
        <StudioStatCard
          label={`Revenue (${latest.month})`}
          value={ready ? formatPrice(latest.revenueCents) : '…'}
          change={`${growth >= 0 ? '+' : ''}${growth}% vs ${previous.month}`}
          trend={growth > 0 ? 'up' : growth < 0 ? 'down' : 'neutral'}
        />
        <StudioStatCard
          label="One-time purchases"
          value={ready ? String(latest.purchases) : '…'}
          change={latest.month}
          trend="neutral"
        />
        <StudioStatCard
          label="Active subscriptions"
          value={ready ? String(latest.subscriptions) : '…'}
          change={latest.month}
          trend="neutral"
        />
      </div>

      <section className="rounded-2xl border border-border-subtle bg-surface p-6 shadow-soft">
        <h2 className="font-semibold text-foreground">Revenue over time</h2>
        <p className="mt-1 text-sm text-muted-foreground">Last 6 months</p>
        <div className="mt-8 flex h-52 items-end justify-between gap-4">
          {revenueHistory.map((point) => {
            const height =
              point.revenueCents > 0
                ? Math.round((point.revenueCents / chartMax) * 100)
                : 0;

            return (
              <div key={point.month} className="flex flex-1 flex-col items-center gap-3">
                <span className="text-xs font-medium text-foreground">
                  {formatPrice(point.revenueCents)}
                </span>
                <div
                  className="w-full max-w-12 rounded-t-lg bg-gradient-to-t from-accent to-accent/60"
                  style={{ height: height > 0 ? `${height}%` : '2px' }}
                />
                <span className="text-xs text-muted-foreground">{point.month}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-border-subtle bg-surface p-6 shadow-soft">
        <h2 className="font-semibold text-foreground">Revenue by course</h2>
        {!ready ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading courses…</p>
        ) : courses.length > 0 ? (
          <div className="mt-4 space-y-3">
            {courses.map((course) => (
              <div
                key={course.id}
                className="rounded-xl border border-border-subtle p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-foreground">{course.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {course.lessonCount} lessons · {course.moduleCount} modules
                    </p>
                  </div>
                  <p className="font-semibold text-foreground">{formatPrice(0)}</p>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-border-subtle">
                  <div className="h-full w-0 rounded-full bg-accent" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            Create a course to track earnings by course.
          </p>
        )}
      </section>
    </div>
  );
}
