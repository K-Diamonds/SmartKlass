import { ModuleBuilderLoader } from '@/components/studio/ModuleBuilderLoader';

type PageProps = {
  params: Promise<{ id: string; moduleId: string }>;
};

export default async function ModuleBuilderPage({ params }: PageProps) {
  const { id, moduleId } = await params;

  return <ModuleBuilderLoader courseId={id} moduleId={moduleId} />;
}
