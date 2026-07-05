'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getAuthToken } from '@/lib/api/client';
import { getMe } from '@/lib/api/users';

export type AuthSession = {
  isAuthenticated: boolean;
  isCreator: boolean;
  creatorCourseCount: number;
  isLoading: boolean;
};

export function getCreatorStudioLabel(
  session: Pick<AuthSession, 'isCreator' | 'creatorCourseCount'>,
  labels: {
    becomeCreator: string;
    openCreatorStudio: string;
    creatorDashboard: string;
  },
): string {
  if (session.isCreator && session.creatorCourseCount > 0) {
    return labels.creatorDashboard;
  }

  if (session.isCreator) {
    return labels.openCreatorStudio;
  }

  return labels.becomeCreator;
}

export function useAuthSession(): AuthSession {
  const pathname = usePathname();
  const [session, setSession] = useState<AuthSession>({
    isAuthenticated: false,
    isCreator: false,
    creatorCourseCount: 0,
    isLoading: true,
  });

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      const token = getAuthToken();

      if (!token) {
        if (!cancelled) {
          setSession({
            isAuthenticated: false,
            isCreator: false,
            creatorCourseCount: 0,
            isLoading: false,
          });
        }
        return;
      }

      try {
        const profile = await getMe();
        if (!cancelled) {
          setSession({
            isAuthenticated: true,
            isCreator: profile.isCreator,
            creatorCourseCount: profile.creatorCourseCount,
            isLoading: false,
          });
        }
      } catch {
        if (!cancelled) {
          setSession({
            isAuthenticated: false,
            isCreator: false,
            creatorCourseCount: 0,
            isLoading: false,
          });
        }
      }
    }

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return session;
}
