import { AccessPlansLoader } from '@/components/studio/AccessPlansLoader';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CoursePlansPage({ params }: PageProps) {
  const { id } = await params;

  return <AccessPlansLoader courseId={id} />;
}
