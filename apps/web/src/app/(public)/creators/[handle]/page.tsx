import { redirect } from 'next/navigation';
import { discoverCreatorUrl } from '@/lib/discover';

type PageProps = {
  params: Promise<{ handle: string }>;
};

export default async function CreatorProfilePage({ params }: PageProps) {
  const { handle } = await params;
  redirect(discoverCreatorUrl(handle));
}
