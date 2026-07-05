import { StudioSidebar } from '@/components';
import { StudioAccessGate } from '@/components/studio/StudioAccessGate';

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StudioAccessGate>
      <div className="flex min-h-screen">
        <StudioSidebar />
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
        </main>
      </div>
    </StudioAccessGate>
  );
}
