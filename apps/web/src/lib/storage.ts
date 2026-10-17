// localStorage can throw (private mode, blocked site data). Preferences are conveniences, so
// failures fall back to defaults instead of breaking the app.
export function readPref(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writePref(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignored: the choice applies for this visit only
  }
}
