// ◎ i18n Context — VDL-FLOW 語言切換系統
// 支援繁體中文 (zh-TW) 與英文 (en)，語言偏好自動存入 localStorage

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { zhTW } from './zh-TW';
import { en } from './en';

export type Lang = 'zh-TW' | 'en';
export type TranslationDict = Record<string, string>;

const dictionaries: Record<Lang, TranslationDict> = {
  'zh-TW': zhTW,
  'en': en,
};

const STORAGE_KEY = 'vdl-flow-lang';

function getInitialLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'zh-TW') return stored;
  } catch { /* SSR / privacy mode */ }
  return 'zh-TW';
}

export type TFunction = (key: string, params?: Record<string, string | number>) => string;

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: TFunction;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getInitialLang);

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang);
    try { localStorage.setItem(STORAGE_KEY, newLang); } catch { /* ignore */ }
  }, []);

  const t: TFunction = useCallback((key: string, params?: Record<string, string | number>) => {
    const dict = dictionaries[lang];
    let text = dict[key] ?? dictionaries['zh-TW'][key] ?? key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      });
    }
    return text;
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
