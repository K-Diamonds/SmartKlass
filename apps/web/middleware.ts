import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { LOCALE_COOKIE } from '@smartklass/shared';
import { resolveLocaleFromRequest } from './src/lib/i18n/resolve-locale';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  if (!request.cookies.get(LOCALE_COOKIE)?.value) {
    const locale = resolveLocaleFromRequest(request);
    response.cookies.set(LOCALE_COOKIE, locale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
