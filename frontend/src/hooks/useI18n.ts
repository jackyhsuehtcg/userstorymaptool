import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';
import type { Namespace } from '../i18n';

/**
 * Custom hook for i18n with fallback support
 * Logs warnings when translations are missing
 */
export const useI18n = (ns?: Namespace) => {
  const { t, i18n } = useTranslation(ns);

  // Enhanced translation function with fallback and warning
  const translate = useCallback(
    (key: string, defaultValue?: string): string => {
      const translation = t(key, { defaultValue });

      // Check if translation key was not found (returns key itself)
      if (translation === key && defaultValue === undefined) {
        const fullKey = ns ? `${ns}:${key}` : key;
        console.warn(
          `Translation missing: ${fullKey} in language ${i18n.language}`
        );
      }

      return translation;
    },
    [t, i18n.language, ns]
  );

  return { t: translate, i18n };
};

/**
 * Hook for accessing multiple namespaces
 */
export const useI18nMultiple = (...namespaces: Namespace[]) => {
  const translations = namespaces.map((ns) => useTranslation(ns));

  return {
    i18n: translations[0].i18n,
    t: (namespace: Namespace, key: string, defaultValue?: string): string => {
      const nsIndex = namespaces.indexOf(namespace);
      if (nsIndex === -1) {
        console.warn(`Namespace not loaded: ${namespace}`);
        return defaultValue || key;
      }
      return translations[nsIndex].t(key, { defaultValue });
    },
  };
};
