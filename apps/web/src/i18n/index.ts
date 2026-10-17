import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { DEFAULT_LANG, isLang, type Lang } from '@recipebook/core';
import { readPref, writePref } from '../lib/storage.ts';
import mlCommon from './locales/ml/common.json';
import enCommon from './locales/en/common.json';

const STORAGE_KEY = 'rb-lang';

/** True once the person has picked a language (first-visit chooser or Settings). */
export function hasChosenLanguage(): boolean {
  return isLang(readPref(STORAGE_KEY));
}

function initialLang(): Lang {
  const stored = readPref(STORAGE_KEY);
  // Malayalam-first (decision D8): we don't follow the browser language, because most phones here
  // are set to English even when the person prefers Malayalam.
  return isLang(stored) ? stored : DEFAULT_LANG;
}

export function setLanguage(lang: Lang) {
  writePref(STORAGE_KEY, lang);
  void i18n.changeLanguage(lang);
}

export function currentLang(): Lang {
  return isLang(i18n.language) ? i18n.language : DEFAULT_LANG;
}

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
});

void i18n.use(initReactI18next).init({
  resources: {
    ml: { common: mlCommon },
    en: { common: enCommon },
  },
  lng: initialLang(),
  fallbackLng: 'en',
  supportedLngs: ['ml', 'en'],
  defaultNS: 'common',
  interpolation: { escapeValue: false }, // React already escapes
  returnNull: false,
});
document.documentElement.lang = i18n.language;

export default i18n;
