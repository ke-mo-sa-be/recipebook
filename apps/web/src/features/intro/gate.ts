/**
 * Whether to play the welcome animation on this page load. Decided once, at start-up: only when the
 * visit lands on Home (a shared recipe link opens straight away), once per browser session, and never
 * for people who ask their phone for less motion.
 */
function decide(): boolean {
  if (import.meta.env.MODE === 'test') return false;
  try {
    if (window.location.pathname !== '/') return false;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    if (sessionStorage.getItem('rb-intro-played')) return false;
    sessionStorage.setItem('rb-intro-played', '1');
    return true;
  } catch {
    return false;
  }
}

export const playIntroOnStart = decide();
