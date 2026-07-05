'use client';

import { useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import {
  LOCALE_COOKIE,
  normalizeUiLocale,
  toI18nLanguage,
  type UiLocaleCode,
} from '@smartklass/shared';
import i18n from '@/i18n/instance';
import {
  persistLocale,
  resolveInitialLocale,
} from '@/lib/i18n/locale';

function readCookieLocale(): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const match = document.cookie.match(
    new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function syncLanguage(language: string) {
  if (i18n.language !== language) {
    i18n.changeLanguage(language);
  }
}

export function changeUiLocale(locale: UiLocaleCode) {
  const normalized = normalizeUiLocale(locale);
  persistLocale(normalized);
  void i18n.changeLanguage(toI18nLanguage(normalized));
}

type I18nProviderProps = {
  children: React.ReactNode;
  serverLocale?: string;
};

export function I18nProvider({ children, serverLocale }: I18nProviderProps) {
  const serverLanguage = toI18nLanguage(normalizeUiLocale(serverLocale));
  syncLanguage(serverLanguage);

  useEffect(() => {
    const resolved = resolveInitialLocale({
      cookieLocale: readCookieLocale(),
      acceptLanguage: navigator.language,
    });
    const resolvedLanguage = toI18nLanguage(resolved);

    if (resolvedLanguage !== serverLanguage) {
      void i18n.changeLanguage(resolvedLanguage);
      persistLocale(resolved);
    }
  }, [serverLanguage]);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
