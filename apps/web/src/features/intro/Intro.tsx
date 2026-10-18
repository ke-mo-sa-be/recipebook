import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sticker } from '../../components/ui/Sticker.tsx';
import { brand } from '../../brand/brand.ts';
import { INTRO_WORDS, introFamily } from './words.ts';
import './intro-fonts.css';
import './intro.css';

const STEP_MS = 150; // each language's word
const HOLD_MS = 700; // പാചകം and the stickers
const FADE_MS = 280; // matches intro.css
const FONT_WAIT_MS = 600; // never hold the app back for slow fonts; phones have system fallbacks

type Phase = 'icon' | number | 'final';

/**
 * The welcome animation: the app icon, then "cooking" in eight Indian languages flipping past, landing
 * on പാചകം / Paachakam with a few stickers. About two seconds; a tap anywhere skips it.
 */
export function Intro({ onDone }: { onDone: () => void }) {
  const { t, i18n } = useTranslation();
  const [phase, setPhase] = useState<Phase>('icon');
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timers: number[] = [];
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
    const fonts = Promise.all(
      INTRO_WORDS.map((w) => document.fonts.load(`700 48px "${introFamily(w.family)}"`, w.word)),
    ).catch(() => undefined);
    const wait = new Promise((r) => setTimeout(r, FONT_WAIT_MS));
    void Promise.race([fonts, wait]).then(() => {
      if (cancelled) return;
      INTRO_WORDS.forEach((_, i) => at(i * STEP_MS, () => setPhase(i)));
      const end = INTRO_WORDS.length * STEP_MS;
      at(end, () => setPhase('final'));
      at(end + HOLD_MS, () => setLeaving(true));
      at(end + HOLD_MS + FADE_MS, onDone);
    });
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [onDone]);

  const word = typeof phase === 'number' ? INTRO_WORDS[phase] : undefined;

  return (
    <div
      className="pk-intro fixed inset-0 z-[60] flex flex-col items-center justify-center gap-3 bg-bg px-6 text-center"
      data-leaving={leaving}
      data-testid="intro"
      onClick={onDone}
    >
      <div aria-hidden className="relative flex min-h-[9rem] flex-col items-center justify-center">
        {phase === 'icon' && (
          <img src={brand.logo} alt="" width={96} height={96} className="pk-pop size-24" />
        )}
        {word && (
          <div key={word.lang} className="pk-flip flex flex-col items-center gap-2" lang={word.lang}>
            <span
              className="text-[clamp(3rem,14vw,4.5rem)] leading-tight font-bold"
              style={{ fontFamily: `'${introFamily(word.family)}', system-ui, sans-serif` }}
            >
              {word.word}
            </span>
            <span className="text-small text-text-muted" lang={i18n.language}>
              {t(`intro.languages.${word.lang}`)} · {word.latin}
            </span>
          </div>
        )}
        {phase === 'final' && (
          <div className="pk-flip flex flex-col items-center gap-2">
            <span lang="ml" className="text-[clamp(3.25rem,15vw,5rem)] leading-tight font-bold">
              {brand.name.ml}
            </span>
            <span lang="en" className="text-h3 font-semibold text-text-muted">
              {brand.name.en}
            </span>
            <Sticker slug="hot-pepper" size={64} tilt={-14} className="pk-pop absolute -top-10 -left-14" />
            <Sticker
              slug="coconut"
              size={56}
              tilt={10}
              className="pk-pop absolute -right-12 -bottom-4 [animation-delay:80ms]"
            />
            <Sticker
              slug="herb"
              size={52}
              tilt={18}
              className="pk-pop absolute -top-12 -right-10 [animation-delay:150ms]"
            />
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onDone}
        className="fixed right-5 bottom-[calc(24px+env(safe-area-inset-bottom))] min-h-tap rounded-pill px-4 text-small font-semibold text-text-muted"
      >
        {t('intro.skip')}
      </button>
    </div>
  );
}
