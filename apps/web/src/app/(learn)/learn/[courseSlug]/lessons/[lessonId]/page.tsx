import { LearnExperience } from '@/components/learn/LearnExperience';

type PageProps = {
  params: Promise<{ courseSlug: string; lessonId: string }>;
  searchParams: Promise<{ courseId?: string }>;
};

export default async function LearnLessonPage({ params, searchParams }: PageProps) {
  const { courseSlug, lessonId } = await params;
  const { courseId } = await searchParams;

  return (
    <LearnExperience
      courseSlug={courseSlug}
      lessonId={lessonId}
      courseIdHint={courseId}
    />
  );
}
