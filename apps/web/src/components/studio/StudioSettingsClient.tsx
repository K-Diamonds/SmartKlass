'use client';

import { useEffect, useState } from 'react';
import { StudioPageHeader } from '@/components/studio/StudioPageHeader';
import { StripePayoutsPanel } from '@/components/studio/StripePayoutsPanel';
import {
  getMyCreatorProfile,
  updateMyCreatorProfile,
} from '@/lib/api/creators';
import { ApiRequestError } from '@/lib/api/types';
import { slugifyDisplayName } from '@/lib/slug';

const notificationOptions = [
  'New subscriber alerts',
  'Review moderation queue',
  'Weekly revenue digest',
  'Payout confirmations',
] as const;

export function StudioSettingsClient() {
  const [displayName, setDisplayName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [notifications, setNotifications] = useState<Record<string, boolean>>(
    () =>
      Object.fromEntries(
        notificationOptions.map((label) => [label, true]),
      ) as Record<string, boolean>,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const profile = await getMyCreatorProfile();
        if (cancelled) {
          return;
        }

        setDisplayName(profile.displayName);
        setSlug(profile.slug);
        setHeadline(profile.headline ?? '');
        setBio(profile.bio ?? '');
      } catch (err) {
        if (cancelled) {
          return;
        }

        const text =
          err instanceof ApiRequestError
            ? err.message
            : 'Could not load creator settings.';
        setError(text);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
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
    setError(null);
    setMessage(null);

    const trimmedName = displayName.trim();
    const trimmedSlug = slugifyDisplayName(slug.trim());
    const trimmedHeadline = headline.trim();
    const trimmedBio = bio.trim();

    if (!trimmedName) {
      setError('Display name is required.');
      return;
    }

    if (!trimmedSlug) {
      setError('Creator handle is required.');
      return;
    }

    setIsSaving(true);

    try {
      const updated = await updateMyCreatorProfile({
        displayName: trimmedName,
        slug: trimmedSlug,
        headline: trimmedHeadline || undefined,
        bio: trimmedBio || undefined,
      });

      setDisplayName(updated.displayName);
      setSlug(updated.slug);
      setHeadline(updated.headline ?? '');
      setBio(updated.bio ?? '');
      setMessage('Settings saved.');
    } catch (err) {
      const text =
        err instanceof ApiRequestError
          ? err.message
          : 'Could not save settings.';
      setError(text);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <StudioPageHeader
        eyebrow="Account"
        title="Settings"
        description="Configure your creator profile, notifications, and Stripe payouts."
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading settings…</p>
      ) : (
        <form className="max-w-2xl space-y-6" onSubmit={handleSubmit}>
          <section className="rounded-2xl border border-border-subtle bg-surface p-6 shadow-soft">
            <h2 className="text-sm font-medium text-foreground">Creator profile</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="displayName"
                  className="block text-xs font-medium text-muted-foreground"
                >
                  Display name
                </label>
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(event) => handleDisplayNameChange(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none ring-ring focus:ring-2"
                />
              </div>
              <div>
                <label
                  htmlFor="handle"
                  className="block text-xs font-medium text-muted-foreground"
                >
                  Handle
                </label>
                <div className="mt-1.5 flex overflow-hidden rounded-xl border border-border">
                  <span className="flex items-center bg-border-subtle px-3 text-sm text-muted-foreground">
                    @
                  </span>
                  <input
                    id="handle"
                    type="text"
                    value={slug}
                    onChange={(event) => {
                      setSlugTouched(true);
                      setSlug(event.target.value);
                    }}
                    className="flex-1 bg-background px-4 py-3 text-sm outline-none"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="headline"
                  className="block text-xs font-medium text-muted-foreground"
                >
                  Headline
                </label>
                <input
                  id="headline"
                  type="text"
                  value={headline}
                  onChange={(event) => setHeadline(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none ring-ring focus:ring-2"
                />
              </div>
              <div>
                <label
                  htmlFor="bio"
                  className="block text-xs font-medium text-muted-foreground"
                >
                  Bio
                </label>
                <textarea
                  id="bio"
                  rows={4}
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none ring-ring focus:ring-2"
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border-subtle bg-surface p-6 shadow-soft">
            <h2 className="text-sm font-medium text-foreground">Notifications</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Saved on this device for now. Email delivery preferences are coming soon.
            </p>
            <div className="mt-4 space-y-3">
              {notificationOptions.map((label) => (
                <label
                  key={label}
                  className="flex cursor-pointer items-center justify-between rounded-xl border border-border-subtle px-4 py-3"
                >
                  <span className="text-sm text-foreground">{label}</span>
                  <input
                    type="checkbox"
                    checked={notifications[label]}
                    onChange={(event) =>
                      setNotifications((current) => ({
                        ...current,
                        [label]: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 accent-accent"
                  />
                </label>
              ))}
            </div>
          </section>

          <StripePayoutsPanel />

          {message && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400" role="status">
              {message}
            </p>
          )}

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="rounded-full bg-foreground px-6 py-2.5 text-sm font-medium text-background disabled:opacity-60"
          >
            {isSaving ? 'Saving…' : 'Save settings'}
          </button>
        </form>
      )}
    </div>
  );
}
