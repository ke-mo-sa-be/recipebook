import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { DEFAULT_LANG, isLang, type Lang } from '@recipebook/core';
import mlCommon from './locales/ml/common.json';
import enCommon from './locales/en/common.json';

const STORAGE_KEY = 'rb-lang';

function storedLang(): Lang {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (isLang(value)) return value;
  } catch {
    // storage blocked (private mode) — fall through to the default
  }
  // Malayalam-first: we don't follow the browser language, because most phones here are set to English
  // even when the person prefers Malayalam. A first-visit chooser and Settings let people switch.
  return DEFAULT_LANG;
}

export function setLanguage(lang: Lang) {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // non-fatal: the choice just won't survive a reload
  }
  void i18n.changeLanguage(lang);
}

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
});

void i18n.use(initReactI18next).init({
  resources: {
    ml: { common: mlCommon },
    en: { common: enCommon },
  },
  lng: storedLang(),
  fallbackLng: 'en',
  supportedLngs: ['ml', 'en'],
  defaultNS: 'common',
  interpolation: { escapeValue: false }, // React already escapes
  returnNull: false,
});

export default i18n;
