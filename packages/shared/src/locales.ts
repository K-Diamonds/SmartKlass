/** BCP-47 UI locales supported by SmartKlass. */
export const SUPPORTED_UI_LOCALES = [
  { code: 'en-US', label: 'English (US)', i18n: 'en' },
  { code: 'es-ES', label: 'Español', i18n: 'es' },
] as const;

export type UiLocaleCode = (typeof SUPPORTED_UI_LOCALES)[number]['code'];

/** ISO 639-1 course content languages. */
export const SUPPORTED_COURSE_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
] as const;

export type CourseLanguageCode = (typeof SUPPORTED_COURSE_LANGUAGES)[number]['code'];

export const LOCALE_COOKIE = 'smartklass_locale' as const;
export const DEFAULT_UI_LOCALE: UiLocaleCode = 'en-US';
export const DEFAULT_COURSE_LANGUAGE: CourseLanguageCode = 'en';

const COUNTRY_LOCALE_MAP: Record<string, UiLocaleCode> = {
  US: 'en-US',
  GB: 'en-US',
  CA: 'en-US',
  AU: 'en-US',
  ES: 'es-ES',
  MX: 'es-ES',
  AR: 'es-ES',
  CO: 'es-ES',
};

/** Map BCP-47 or i18n code to i18next language key (en, es, …). */
export function toI18nLanguage(locale: string): string {
  const normalized = locale.trim();
  const match = SUPPORTED_UI_LOCALES.find(
    (entry) =>
      entry.code.toLowerCase() === normalized.toLowerCase() ||
      entry.i18n === normalized.split('-')[0]?.toLowerCase(),
  );
  if (match) {
    return match.i18n;
  }
  const base = normalized.split('-')[0]?.toLowerCase();
  const byBase = SUPPORTED_UI_LOCALES.find((entry) => entry.i18n === base);
  return byBase?.i18n ?? 'en';
}

/** Normalize any locale string to a supported UI locale code. */
export function normalizeUiLocale(locale: string | null | undefined): UiLocaleCode {
  if (!locale) {
    return DEFAULT_UI_LOCALE;
  }
  const exact = SUPPORTED_UI_LOCALES.find(
    (entry) => entry.code.toLowerCase() === locale.toLowerCase(),
  );
  if (exact) {
    return exact.code;
  }
  const base = locale.split('-')[0]?.toLowerCase();
  const byBase = SUPPORTED_UI_LOCALES.find((entry) => entry.i18n === base);
  return byBase?.code ?? DEFAULT_UI_LOCALE;
}

export function localeFromCountry(countryCode: string | null | undefined): UiLocaleCode | null {
  if (!countryCode) {
    return null;
  }
  return COUNTRY_LOCALE_MAP[countryCode.toUpperCase()] ?? null;
}

export function localeFromAcceptLanguage(header: string | null | undefined): UiLocaleCode | null {
  if (!header) {
    return null;
  }
  const parts = header.split(',').map((part) => part.trim().split(';')[0]);
  for (const part of parts) {
    const normalized = normalizeUiLocale(part);
    if (normalized) {
      return normalized;
    }
  }
  return null;
}

export function getCourseLanguageLabel(code: string): string {
  const match = SUPPORTED_COURSE_LANGUAGES.find(
    (lang) => lang.code === code.toLowerCase(),
  );
  return match?.label ?? code.toUpperCase();
}

export function getUiLocaleLabel(code: string): string {
  const match = SUPPORTED_UI_LOCALES.find(
    (locale) => locale.code.toLowerCase() === code.toLowerCase(),
  );
  return match?.label ?? code;
}
