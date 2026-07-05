import {
  DEFAULT_UI_LOCALE,
  LOCALE_COOKIE,
  localeFromAcceptLanguage,
  localeFromCountry,
  normalizeUiLocale,
  toI18nLanguage,
  type UiLocaleCode,
} from '@smartklass/shared';

export const LOCALE_STORAGE_KEY = 'smartklass_locale';

export function getStoredLocale(): UiLocaleCode | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  return stored ? normalizeUiLocale(stored) : null;
}

export function persistLocale(locale: UiLocaleCode): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(locale)}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  document.documentElement.lang = toI18nLanguage(locale);
}

export function resolveInitialLocale(options?: {
  cookieLocale?: string | null;
  acceptLanguage?: string | null;
  countryCode?: string | null;
}): UiLocaleCode {
  const stored = getStoredLocale();
  if (stored) {
    return stored;
  }

  if (options?.cookieLocale) {
    return normalizeUiLocale(options.cookieLocale);
  }

  const fromBrowser = localeFromAcceptLanguage(options?.acceptLanguage ?? null);
  if (fromBrowser) {
    return fromBrowser;
  }

  const fromCountry = localeFromCountry(options?.countryCode ?? null);
  if (fromCountry) {
    return fromCountry;
  }

  return DEFAULT_UI_LOCALE;
}

export { LOCALE_COOKIE, toI18nLanguage, normalizeUiLocale };
