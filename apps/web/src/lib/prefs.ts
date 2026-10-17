import { useSyncExternalStore } from 'react';
import { TEXT_SIZES } from '@recipebook/core';
import { readPref, writePref } from './storage.ts';

export const THEMES = ['auto', 'light', 'dark'] as const;
export type ThemePref = (typeof THEMES)[number];
export type TextSize = (typeof TEXT_SIZES)[number];

const THEME_KEY = 'rb-theme';
const SIZE_KEY = 'rb-text-size';

type Prefs = { theme: ThemePref; textSize: TextSize };

function load(): Prefs {
  const theme = readPref(THEME_KEY);
  const size = readPref(SIZE_KEY);
  return {
    theme: (THEMES as readonly string[]).includes(theme ?? '') ? (theme as ThemePref) : 'auto',
    textSize: (TEXT_SIZES as readonly string[]).includes(size ?? '') ? (size as TextSize) : 'normal',
  };
}

let current = load();
const listeners = new Set<() => void>();

/** Reflect preferences on <html>; tokens.css switches theme and root font size from these attributes. */
export function applyPrefs() {
  const root = document.documentElement;
  if (current.theme === 'auto') delete root.dataset.theme;
  else root.dataset.theme = current.theme;
  root.dataset.textSize = current.textSize;
}

function update(next: Partial<Prefs>) {
  current = { ...current, ...next };
  writePref(THEME_KEY, current.theme);
  writePref(SIZE_KEY, current.textSize);
  applyPrefs();
  listeners.forEach((l) => l());
}

export const setTheme = (theme: ThemePref) => update({ theme });
export const setTextSize = (textSize: TextSize) => update({ textSize });

export function usePrefs(): Prefs {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
  );
}
