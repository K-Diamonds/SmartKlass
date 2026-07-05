'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_UI_LOCALES } from '@smartklass/shared';
import { normalizeUiLocale } from '@smartklass/shared';
import { changeUiLocale } from '@/components/providers/I18nProvider';
import { ProfileAvatarField } from '@/components/settings/ProfileAvatarField';
import { FilterSelect } from '@/components/ui/FilterSelect';
import { getMe, updateMe, type UserProfile } from '@/lib/api/users';
import { getAuthToken } from '@/lib/api/client';
import { ApiRequestError } from '@/lib/api/types';

export function ProfileSettingsForm() {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [locale, setLocale] = useState('en-US');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [needsSignIn, setNeedsSignIn] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      const token = getAuthToken();
      if (!token) {
        if (!cancelled) {
          setNeedsSignIn(true);
          setIsLoading(false);
        }
        return;
      }

      try {
        const data = await getMe();
        if (cancelled) {
          return;
        }
        setProfile(data);
        setDisplayName(data.displayName);
        setAvatarUrl(data.avatarUrl);
        setBio(data.bio ?? '');
        setLocale(data.locale);
      } catch (err) {
        if (cancelled) {
          return;
        }

        if (err instanceof ApiRequestError && err.status === 401) {
          setNeedsSignIn(true);
          return;
        }

        const text =
          err instanceof ApiRequestError
            ? err.message
            : 'Could not load profile. Sign in to manage settings.';
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSaving(true);

    try {
      const updated = await updateMe({ displayName, bio, locale });
      setProfile(updated);
      changeUiLocale(normalizeUiLocale(updated.locale));
      setMessage(t('settings.profile.saved'));
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 401) {
        setNeedsSignIn(true);
        return;
      }

      const text =
        err instanceof ApiRequestError
          ? err.message
          : 'Could not save profile.';
      setError(text);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <p className="mt-8 text-sm text-muted-foreground">Loading…</p>;
  }

  if (needsSignIn) {
    return (
      <div className="mt-8 max-w-lg rounded-xl border border-border-subtle bg-surface p-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {t('settings.profile.title')}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to view and edit your profile settings.
        </p>
        <Link
          href="/login?next=/settings/profile"
          className="mt-6 inline-flex rounded-full bg-foreground px-6 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          {t('nav.signIn')}
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {t('settings.profile.title')}
      </h1>
      <p className="mt-1 text-muted-foreground">{t('settings.profile.subtitle')}</p>

      <form onSubmit={handleSubmit} className="mt-8 max-w-lg space-y-6">
        <div className="space-y-4 rounded-xl border border-border-subtle bg-surface p-6">
          <ProfileAvatarField
            displayName={displayName || profile?.displayName || 'User'}
            avatarUrl={avatarUrl}
            onAvatarChange={setAvatarUrl}
            onError={(message) => setError(message)}
            disabled={isSaving}
          />

          <div className="border-t border-border-subtle pt-4">
            <label htmlFor="displayName" className="block text-sm font-medium text-foreground">
              {t('settings.profile.displayName')}
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="mt-1.5 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none ring-ring focus:ring-2"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground">
              {t('settings.profile.email')}
            </label>
            <input
              id="email"
              type="email"
              value={profile?.email ?? ''}
              readOnly
              className="mt-1.5 w-full rounded-lg border border-border bg-muted px-4 py-2.5 text-sm text-muted-foreground"
            />
          </div>
          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-foreground">
              {t('settings.profile.bio')}
            </label>
            <textarea
              id="bio"
              rows={3}
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              placeholder={t('settings.profile.bioPlaceholder')}
              className="mt-1.5 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none ring-ring focus:ring-2"
            />
          </div>
          <div>
            <label htmlFor="locale" className="block text-sm font-medium text-foreground">
              {t('settings.profile.language')}
            </label>
            <FilterSelect
              id="locale"
              value={locale}
              onChange={setLocale}
              className="mt-1.5"
            >
              {SUPPORTED_UI_LOCALES.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label}
                </option>
              ))}
            </FilterSelect>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {t('settings.profile.languageHelp')}
            </p>
          </div>
        </div>

        {error && (
          <p className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        {message && (
          <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-700">
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={isSaving}
          className="rounded-full bg-foreground px-6 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {isSaving ? '…' : t('settings.profile.save')}
        </button>
      </form>
    </div>
  );
}
