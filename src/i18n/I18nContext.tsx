import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Platform, NativeModules } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import itDict from './dictionaries/it.json';
import frDict from './dictionaries/fr.json';
import deDict from './dictionaries/de.json';
import enDict from './dictionaries/en.json';

export type Lang = 'it' | 'fr' | 'de' | 'en';

const DICTS: Record<Lang, any> = {
  it: itDict,
  fr: frDict,
  de: deDict,
  en: enDict,
};

const STORAGE_KEY = 'hompra_lang';

function detectDeviceLang(): Lang {
  try {
    const raw: string = Platform.OS === 'ios'
      ? (NativeModules.SettingsManager?.settings?.AppleLocale
        || NativeModules.SettingsManager?.settings?.AppleLanguages?.[0]
        || 'it')
      : (NativeModules.I18nManager?.localeIdentifier || 'it');
    const code = raw.toLowerCase().slice(0, 2);
    if (code === 'fr' || code === 'de' || code === 'en') return code;
    return 'it';
  } catch {
    return 'it';
  }
}

interface I18nContextValue {
  lang: Lang;
  dict: any;
  setLang: (lang: Lang) => Promise<void>;
  /**
   * Traduzione con fallback sicuro. Esempio: t('mobile.login.title', 'Accedi')
   */
  t: (path: string, fallback?: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function getByPath(obj: any, path: string): any {
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('it');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await SecureStore.getItemAsync(STORAGE_KEY);
        if (saved && (saved === 'it' || saved === 'fr' || saved === 'de' || saved === 'en')) {
          setLangState(saved as Lang);
        } else {
          setLangState(detectDeviceLang());
        }
      } catch {
        setLangState(detectDeviceLang());
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const setLang = useCallback(async (next: Lang) => {
    setLangState(next);
    try { await SecureStore.setItemAsync(STORAGE_KEY, next); } catch {}
  }, []);

  const dict = DICTS[lang];

  const t = useCallback(
    (path: string, fallback?: string) => {
      const v = getByPath(dict, path);
      if (typeof v === 'string') return v;
      return fallback ?? path;
    },
    [dict],
  );

  // Non renderizzare nulla finché non abbiamo letto la lingua salvata
  if (!ready) return null;

  return (
    <I18nContext.Provider value={{ lang, dict, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}
