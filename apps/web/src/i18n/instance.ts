import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import {
  I18N_DEFAULT_NS,
  I18N_NAMESPACES,
  i18nResources,
} from '@/i18n/settings';

const i18nInstance = i18n.createInstance();

void i18nInstance.use(initReactI18next).init({
  resources: i18nResources,
  lng: 'en',
  fallbackLng: 'en',
  supportedLngs: ['en', 'es'],
  ns: [...I18N_NAMESPACES],
  defaultNS: I18N_DEFAULT_NS,
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

export default i18nInstance;
