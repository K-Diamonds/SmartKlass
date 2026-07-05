import Link from 'next/link';
import { APP_NAME } from '@smartklass/shared';

export default function LearnLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="glass-nav sticky top-0 z-40 border-b border-border-subtle">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-xs font-bold text-accent-foreground">
              S
            </span>
            <span>{APP_NAME}</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/library"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Library
            </Link>
            <Link
              href="/dashboard"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Dashboard
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
