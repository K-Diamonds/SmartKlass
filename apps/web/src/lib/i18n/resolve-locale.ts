import {
  DEFAULT_UI_LOCALE,
  localeFromAcceptLanguage,
  localeFromCountry,
  normalizeUiLocale,
} from '@smartklass/shared';
import type { NextRequest } from 'next/server';

export function resolveLocaleFromRequest(request: NextRequest): string {
  const cookieLocale = request.cookies.get('smartklass_locale')?.value;
  if (cookieLocale) {
    return normalizeUiLocale(cookieLocale);
  }

  const country =
    request.headers.get('x-vercel-ip-country') ??
    request.headers.get('cf-ipcountry') ??
    null;
  const fromCountry = localeFromCountry(country);
  if (fromCountry) {
    return fromCountry;
  }

  const fromLanguage = localeFromAcceptLanguage(
    request.headers.get('accept-language'),
  );
  if (fromLanguage) {
    return fromLanguage;
  }

  return DEFAULT_UI_LOCALE;
}
