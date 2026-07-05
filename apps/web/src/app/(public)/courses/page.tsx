import { notFound } from 'next/navigation';
import { CourseDetailLoader } from '@/components/course/CourseDetailLoader';

type PageProps = {
  searchParams: Promise<{ id?: string; preview?: string }>;
};

export default async function CourseDetailPage({ searchParams }: PageProps) {
  const { id, preview } = await searchParams;

  if (!id) {
    notFound();
  }

  return <CourseDetailLoader courseId={id} preview={preview === '1'} />;
}
