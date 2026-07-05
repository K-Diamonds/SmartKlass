'use client';

import { LearnErrorState } from '@/components/learn/LearnErrorState';

export default function LearnError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <LearnErrorState
      message={error.message || 'This lesson could not be loaded.'}
      onRetry={reset}
    />
  );
}
