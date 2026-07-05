import { LessonEditorLoader } from '@/components/studio/LessonEditorLoader';

type PageProps = {
  params: Promise<{ id: string; lessonId: string }>;
};

export default async function LessonEditorPage({ params }: PageProps) {
  const { id, lessonId } = await params;

  return <LessonEditorLoader courseId={id} lessonId={lessonId} />;
}
