import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { Fraunces, Plus_Jakarta_Sans } from 'next/font/google';
import { APP_NAME, DEFAULT_UI_LOCALE, LOCALE_COOKIE, normalizeUiLocale, toI18nLanguage } from '@smartklass/shared';
import { AppProviders } from '@/components/providers/AppProviders';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  variable: '--font-jakarta',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const fraunces = Fraunces({
  variable: '--font-fraunces',
  subsets: ['latin'],
  weight: ['500', '600', '700'],
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: 'Premium learning marketplace for everyday creators and learners.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const serverLocale = normalizeUiLocale(
    cookieStore?.get?.(LOCALE_COOKIE)?.value ?? DEFAULT_UI_LOCALE,
  );

  return (
    <html
      lang={toI18nLanguage(serverLocale)}
      data-scroll-behavior="smooth"
      className={`${jakarta.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <AppProviders serverLocale={serverLocale}>{children}</AppProviders>
      </body>
    </html>
  );
}
