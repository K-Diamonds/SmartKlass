'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { APP_NAME } from '@smartklass/shared';
import { AuthForm } from '@/components/auth/AuthForm';

function RegisterLink() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next');
  const href = next
    ? `/register?next=${encodeURIComponent(next)}`
    : '/register';

  return (
    <Link href={href} className="font-medium text-accent hover:underline">
      Create one
    </Link>
  );
}

export function LoginPageClient() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">
            Sign in
          </p>
          <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight text-foreground">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to your {APP_NAME} account
          </p>
        </div>

        <Suspense fallback={null}>
          <AuthForm mode="login" />
        </Suspense>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Suspense fallback={<span>Create one</span>}>
            <RegisterLink />
          </Suspense>
        </p>
      </div>
    </div>
  );
}
