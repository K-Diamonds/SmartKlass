import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { CertificatePaymentClient } from '@/components/studio/CertificatePaymentClient';
import { StudioPageHeader } from '@/components/studio/StudioPageHeader';

type PageProps = {
  searchParams: Promise<{ courseId?: string }>;
};

export default async function StudioPaymentsPage({ searchParams }: PageProps) {
  const { courseId } = await searchParams;

  if (!courseId) {
    redirect('/studio/courses');
  }

  return (
    <div className="space-y-8">
      <StudioPageHeader
        eyebrow="Payments"
        title="Certificate payment"
        description="Complete your one-time certificate enablement fee."
      />
      <Suspense fallback={null}>
        <CertificatePaymentClient courseId={courseId} />
      </Suspense>
    </div>
  );
}
