'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { becomeCreator } from '@/lib/api/creators';
import { getAuthToken } from '@/lib/api/client';
import { getMe } from '@/lib/api/users';
import { ApiRequestError } from '@/lib/api/types';
import { slugifyDisplayName } from '@/lib/slug';

export function BecomeCreatorPanel() {
  const [displayName, setDisplayName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [needsSignIn, setNeedsSignIn] = useState(false);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setNeedsSignIn(true);
      return;
    }

    let cancelled = false;

    async function loadProfile() {
      try {
        const profile = await getMe();
        if (!cancelled) {
          setDisplayName(profile.displayName);
          setSlug(slugifyDisplayName(profile.displayName));
        }
      } catch {
        if (!cancelled) {
          setNeedsSignIn(true);
        }
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleDisplayNameChange = (value: string) => {
    setDisplayName(value);
    if (!slugTouched) {
      setSlug(slugifyDisplayName(value));
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = displayName.trim();
    const trimmedSlug = slug.trim();

    if (!trimmedName) {
      setError('Display name is required.');
      return;
    }

    if (!trimmedSlug) {
      setError('Creator handle is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await becomeCreator({
        displayName: trimmedName,
        slug: trimmedSlug,
      });
      window.location.assign('/studio');
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.message
          : 'Could not enable Creator Mode. Try again.';
      setError(message);
      setIsSubmitting(false);
    }
  };

  if (needsSignIn) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-border-subtle bg-surface p-8 text-center shadow-soft">
        <h1 className="text-2xl font-semibold text-foreground">Become a creator</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Sign in to enable Creator Mode and start building courses.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex rounded-full bg-foreground px-6 py-2.5 text-sm font-medium text-background"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-border-subtle bg-surface p-8 shadow-soft">
      <h1 className="text-2xl font-semibold text-foreground">Become a creator</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Set up your public creator profile to access Creator Studio, publish courses, and
        manage learners.
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="creator-name" className="block text-xs font-medium text-muted-foreground">
            Display name
          </label>
          <input
            id="creator-name"
            type="text"
            value={displayName}
            onChange={(event) => handleDisplayNameChange(event.target.value)}
            className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none ring-ring focus:ring-2"
          />
        </div>
        <div>
          <label htmlFor="creator-slug" className="block text-xs font-medium text-muted-foreground">
            Public handle
          </label>
          <input
            id="creator-slug"
            type="text"
            value={slug}
            onChange={(event) => {
              setSlugTouched(true);
              setSlug(event.target.value);
            }}
            className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none ring-ring focus:ring-2"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Your courses will appear on Explore at /discover?creator={slug || 'your-handle'}
          </p>
        </div>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-full bg-foreground px-6 py-2.5 text-sm font-medium text-background disabled:opacity-60"
        >
          {isSubmitting ? 'Enabling…' : 'Enable Creator Mode'}
        </button>
      </form>
    </div>
  );
}
