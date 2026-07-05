'use client';

import { useAuthSession } from '@/hooks/useAuthSession';
import { BecomeCreatorPanel } from './BecomeCreatorPanel';

type StudioAccessGateProps = {
  children: React.ReactNode;
};

export function StudioAccessGate({ children }: StudioAccessGateProps) {
  const { isAuthenticated, isCreator, isLoading } = useAuthSession();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading Creator Studio…</p>
      </div>
    );
  }

  if (!isAuthenticated || !isCreator) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
        <BecomeCreatorPanel />
      </div>
    );
  }

  return children;
}
