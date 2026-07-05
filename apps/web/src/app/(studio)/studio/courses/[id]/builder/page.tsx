import { Suspense } from 'react';
import { CourseBuilderLoader } from '@/components/studio/CourseBuilderLoader';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CourseBuilderPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <Suspense fallback={null}>
      <CourseBuilderLoader courseId={id} />
    </Suspense>
  );
}
