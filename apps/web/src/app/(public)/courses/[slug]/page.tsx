import { notFound, redirect } from 'next/navigation';
import { getPublishedCourseBySlug } from '@/lib/api/courses';
import { getCourseBySlug } from '@/lib/mock-data';
import { coursePublicUrl } from '@/lib/courses';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function LegacyCourseSlugRedirect({ params }: PageProps) {
  const { slug } = await params;

  try {
    const course = await getPublishedCourseBySlug(slug);
    redirect(coursePublicUrl(course.id));
  } catch {
    const mock = getCourseBySlug(slug);
    if (!mock) {
      notFound();
    }
    redirect(coursePublicUrl(mock.id));
  }
}
