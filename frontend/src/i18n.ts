import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpApi from 'i18next-http-backend';

// Supported languages
export const SUPPORTED_LANGUAGES = {
  'en-US': 'English',
  'zh-CN': '中文（简体）',
  'zh-TW': '繁體中文',
};

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES;

// Namespaces
export const NAMESPACES = ['ui', 'team', 'messages'] as const;
export type Namespace = (typeof NAMESPACES)[number];

i18n
  // Load translation using http backend
  .use(HttpApi)
  // Detect user language
  .use(LanguageDetector)
  // Pass the i18n instance to react-i18next
  .use(initReactI18next)
  // Initialize i18next
  .init({
    // Supported languages
    supportedLngs: Object.keys(SUPPORTED_LANGUAGES),

    // Fallback language
    fallbackLng: 'en-US',

    // Fallback namespace
    fallbackNS: 'ui',

    // Default namespace
    defaultNS: 'ui',

    // Namespaces
    ns: NAMESPACES,

    // Backend configuration for loading translations
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },

    // Detection options
    detection: {
      // Order of detection methods
      order: [
        'localStorage', // Check localStorage for language preference
        'navigator', // Check browser language
        'htmlTag', // Check html tag lang attribute
      ],

      // Cache user language in localStorage
      caches: ['localStorage'],

      // Store language as: 'languageOnly' or 'languageAndRegion'
      lookupLocalStorage: 'i18nextLng',
      lookupFromPathIndex: 0,
      lookupFromSubdomainIndex: 0,
    },

    // Interpolation
    interpolation: {
      // React already escapes XSS by default
      escapeValue: false,
      // Format variables: {{ key }}
      prefix: '{{',
      suffix: '}}',
    },

    // React settings
    react: {
      // Disable suspense since we're using useSuspense: false in init
      useSuspense: false,
      // Bind events for language change
      bindI18n: 'languageChanged loaded',
      bindI18nStore: 'added removed',
    },

    // Load translations on initialization
    load: 'currentOnly',

    // Preload languages
    preload: ['en-US', 'zh-CN'],
  });

export default i18n;
