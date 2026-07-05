'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { APP_NAME } from '@smartklass/shared';
import { AuthForm } from '@/components/auth/AuthForm';

function LoginLink() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next');
  const href = next ? `/login?next=${encodeURIComponent(next)}` : '/login';

  return (
    <Link href={href} className="font-medium text-accent hover:underline">
      Sign in
    </Link>
  );
}

export function RegisterPageClient() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">
            Get started
          </p>
          <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight text-foreground">
            Create your account
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Join {APP_NAME} — learn or teach on your terms
          </p>
        </div>

        <Suspense fallback={null}>
          <AuthForm mode="register" />
        </Suspense>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Suspense fallback={<span>Sign in</span>}>
            <LoginLink />
          </Suspense>
        </p>
      </div>
    </div>
  );
}
