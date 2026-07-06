'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ShieldOff } from 'lucide-react';
import { LoadingState } from '@/components/ui/LoadingState';
import { verifyAdminAccess } from '@/lib/api/admin';
import { useAuthSession } from '@/hooks/useAuthSession';
import { AdminSidebar } from './AdminSidebar';
import { AdminTopBar } from './AdminTopBar';
import { AdminGridBackground } from './AdminOpsShortcuts';

type AdminAccessGateProps = {
  children: ReactNode;
};

export function AdminAccessGate({ children }: AdminAccessGateProps) {
  const { isAuthenticated, isLoading: authLoading } = useAuthSession();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (authLoading) return;
      if (!isAuthenticated) {
        setChecking(false);
        setAllowed(false);
        return;
      }
      const ok = await verifyAdminAccess();
      if (!cancelled) {
        setAllowed(ok);
        setChecking(false);
      }
    }

    void check();
    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated]);

  if (authLoading || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#08080c]">
        <LoadingState variant="page" label="Verifying staff access…" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#08080c] px-4 text-center">
        <ShieldOff size={40} className="text-white/25" />
        <h1 className="mt-4 text-xl font-semibold text-white">Sign in required</h1>
        <p className="mt-2 max-w-sm text-sm text-white/45">
          Admin tools require an authenticated staff account.
        </p>
        <Link
          href="/login?next=/admin"
          className="mt-6 rounded-lg bg-[#d4a853] px-5 py-2.5 text-sm font-medium text-[#0c0c0a]"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#08080c] px-4 text-center">
        <ShieldOff size={40} className="text-red-400/60" />
        <h1 className="mt-4 text-xl font-semibold text-white">Staff access only</h1>
        <p className="mt-2 max-w-md text-sm text-white/45">
          Your account is not on the staff allowlist. Contact platform ops to add
          your email to <code className="text-white/60">STAFF_EMAILS</code>.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 text-sm text-white/50 hover:text-white"
        >
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#08080c] text-white">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopBar />
        <main className="flex-1 overflow-y-auto">
          <AdminGridBackground>
            <div className="mx-auto max-w-[1400px] px-6 py-8 lg:px-10">{children}</div>
          </AdminGridBackground>
        </main>
      </div>
    </div>
  );
}
