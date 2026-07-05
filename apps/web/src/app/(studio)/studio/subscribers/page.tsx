import { EmptyState } from '@/components';
import { StudioPageHeader } from '@/components/studio/StudioPageHeader';

export default function StudioSubscribersPage() {
  return (
    <div className="space-y-8">
      <StudioPageHeader
        eyebrow="Audience"
        title="Subscribers"
        description="Stripe-style subscriber management across all access plans."
      />
      <EmptyState
        title="No subscribers yet"
        description="When learners subscribe to your courses, they will show up here."
      />
    </div>
  );
}
