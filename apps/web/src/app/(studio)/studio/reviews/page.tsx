import { EmptyState } from '@/components';
import { StudioPageHeader } from '@/components/studio/StudioPageHeader';

export default function StudioReviewsPage() {
  return (
    <div className="space-y-8">
      <StudioPageHeader
        eyebrow="Feedback"
        title="Reviews"
        description="Moderate learner reviews before they appear on your course pages."
      />
      <EmptyState
        title="No reviews yet"
        description="Learner reviews on your published courses will appear here."
      />
    </div>
  );
}
