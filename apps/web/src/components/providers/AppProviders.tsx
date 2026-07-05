'use client';

import { I18nProvider } from './I18nProvider';
import { FavoritesProvider } from '@/hooks/useFavorites';

type AppProvidersProps = {
  children: React.ReactNode;
  serverLocale?: string;
};

export function AppProviders({ children, serverLocale }: AppProvidersProps) {
  return (
    <I18nProvider serverLocale={serverLocale}>
      <FavoritesProvider>{children}</FavoritesProvider>
    </I18nProvider>
  );
}
