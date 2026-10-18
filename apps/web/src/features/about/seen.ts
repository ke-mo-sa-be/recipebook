import { useState } from 'react';
import { readPref, writePref } from '../../lib/storage.ts';
import { APP_VERSION } from './releases.ts';

const SEEN_KEY = 'rb-seen-version';

export function markVersionSeen() {
  writePref(SEEN_KEY, APP_VERSION);
}

/**
 * True when this browser last ran an older version, so Home can say "Paachakam was updated".
 * A first visit records the version silently: there's nothing "new" to someone who just arrived.
 */
export function useUpdateNotice(): [boolean, () => void] {
  const [show, setShow] = useState(() => {
    const seen = readPref(SEEN_KEY);
    if (seen === null) markVersionSeen();
    return seen !== null && seen !== APP_VERSION;
  });
  return [
    show,
    () => {
      markVersionSeen();
      setShow(false);
    },
  ];
}
