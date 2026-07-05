import en from './locales/en/common.json';
import es from './locales/es/common.json';

export const i18nResources = {
  en: { common: en },
  es: { common: es },
} as const;

export const I18N_NAMESPACES = ['common'] as const;
export const I18N_DEFAULT_NS = 'common';
