import { useSyncExternalStore } from 'react';
import { readPref, writePref } from '../../lib/storage.ts';

// Chrome/Edge/Samsung fire `beforeinstallprompt` when the app is installable; we keep the event and
// show our own card instead of the browser's mini bar. iPhones have no such event, so there the card
// explains Share → Add to Home Screen.
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const DISMISSED_KEY = 'rb-install-dismissed';
const SNOOZE_MS = 30 * 24 * 60 * 60 * 1000; // "Not now" hides the card for 30 days

let deferred: InstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Call once at start-up, before React renders: the event can fire very early. */
export function initInstall() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    deferred = null;
    emit();
  });
  // Production only: in dev, Vite serves modules the worker shouldn't see.
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => void navigator.serviceWorker.register('/sw.js'));
  }
}

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIosSafari() {
  const ua = navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
}

function snoozed() {
  const at = Number(readPref(DISMISSED_KEY) ?? 0);
  return Date.now() - at < SNOOZE_MS;
}

export type InstallState = 'hidden' | 'prompt' | 'ios';

function state(): InstallState {
  if (installed || isStandalone() || snoozed()) return 'hidden';
  if (deferred) return 'prompt';
  return isIosSafari() ? 'ios' : 'hidden';
}

let cached: InstallState = 'hidden';
function snapshot() {
  const next = state();
  if (next !== cached) cached = next;
  return cached;
}

export function useInstall(): InstallState {
  return useSyncExternalStore((l) => {
    listeners.add(l);
    return () => listeners.delete(l);
  }, snapshot);
}

/** Opens the browser's install dialog. Returns true if the person installed. */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const event = deferred;
  deferred = null;
  await event.prompt();
  const { outcome } = await event.userChoice;
  emit();
  return outcome === 'accepted';
}

export function snoozeInstall() {
  writePref(DISMISSED_KEY, String(Date.now()));
  emit();
}
