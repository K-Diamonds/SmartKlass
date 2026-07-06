import { Suspense } from 'react';
import { AdminPayoutsPage } from '@/components/admin/pages/AdminPayoutsPage';
import { LoadingState } from '@/components/ui/LoadingState';

export default function Page() {
  return (
    <Suspense fallback={<LoadingState variant="page" label="Loading payouts…" />}>
      <AdminPayoutsPage />
    </Suspense>
  );
}
