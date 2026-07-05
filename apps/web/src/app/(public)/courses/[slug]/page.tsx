import { notFound, redirect } from 'next/navigation';
import { getCourseBySlug } from '@/lib/mock-data';
import { coursePublicUrl } from '@/lib/courses';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function LegacyCourseSlugRedirect({ params }: PageProps) {
  const { slug } = await params;
  const course = getCourseBySlug(slug);

  if (!course) {
    notFound();
  }

  redirect(coursePublicUrl(course.id));
}
