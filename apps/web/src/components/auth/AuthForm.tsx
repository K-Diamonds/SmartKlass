'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { normalizeUiLocale } from '@smartklass/shared';
import { changeUiLocale } from '@/components/providers/I18nProvider';
import { ApiRequestError } from '@/lib/api/types';
import { login, register } from '@/lib/api/auth';
import { getMe } from '@/lib/api/users';

type AuthFormProps = {
  mode: 'login' | 'register';
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next');
  const safeNextPath =
    nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//')
      ? nextPath
      : '/dashboard';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, displayName);
      }

      try {
        const profile = await getMe();
        changeUiLocale(normalizeUiLocale(profile.locale));
      } catch {
        // Profile locale sync is best-effort after auth.
      }

      router.push(safeNextPath);
      router.refresh();
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.message
          : 'Something went wrong. Please try again.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-8 space-y-4 rounded-3xl border border-border bg-surface p-8 shadow-card"
    >
      {mode === 'register' && (
        <div>
          <label htmlFor="displayName" className="block text-sm font-medium text-foreground">
            Display name
          </label>
          <input
            id="displayName"
            type="text"
            autoComplete="name"
            required
            minLength={2}
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none ring-ring focus:ring-2"
          />
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-foreground">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none ring-ring focus:ring-2"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-foreground">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none ring-ring focus:ring-2"
        />
      </div>

      {error && (
        <p className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-full bg-accent py-3 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {isSubmitting
          ? 'Please wait…'
          : mode === 'login'
            ? 'Sign in'
            : 'Create account'}
      </button>
    </form>
  );
}
