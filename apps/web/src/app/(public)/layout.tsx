import { PublicFooter, PublicNavbar } from '@/components';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PublicNavbar />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </>
  );
}
