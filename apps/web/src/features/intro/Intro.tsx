import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { brand } from '../../brand/brand.ts';
import { MALAYALAM, REEL_SCRIPTS, introFamily } from './syllables.ts';
import './intro-fonts.css';
import './intro.css';

const REEL_MS = [1000, 1200, 1400]; // the reels lock left to right
const CLOSE_MS = 300; // the syllables close up into one word (intro.css .pk-reel)
const HOLD_MS = 750;
const FADE_MS = 280; // intro.css .pk-intro
const FONT_WAIT_MS = 600; // never hold the app back for slow fonts; phones have system fallbacks
const ML_FAMILY = 'Noto Sans Malayalam Variable';

type Phase = 'waiting' | 'spinning' | 'landed';

/**
 * The welcome animation: പാ · ച · കം as three reels rolling through eight other Indian scripts (the word
 * sounds the same in all of them) and locking into Malayalam, then "Paachakam". About 2.5 s; a tap skips.
 */
export function Intro({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>('waiting');
  const [leaving, setLeaving] = useState(false);
  const [shift, setShift] = useState<number[]>([0, 0, 0]);
  const reels = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    let cancelled = false;
    const timers: number[] = [];
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
    const fonts = Promise.all([
      ...REEL_SCRIPTS.map((r) =>
        document.fonts.load(`700 48px "${introFamily(r.family)}"`, r.syllables.join('')),
      ),
      document.fonts.load(`700 48px "${ML_FAMILY}"`, MALAYALAM.join('')),
    ]).catch(() => undefined);
    const wait = new Promise((r) => setTimeout(r, FONT_WAIT_MS));
    void Promise.race([fonts, wait]).then(() => {
      if (cancelled) return;
      // Each reel is as wide as its widest syllable, so nothing moves sideways while it spins. Once they
      // land, slide them together so the Malayalam syllables sit side by side as one word.
      const boxes = reels.current.map((el) => el?.getBoundingClientRect().width ?? 0);
      const glyphs = reels.current.map(
        (el) => (el?.querySelector('.pk-cell:last-child') as HTMLElement | null)?.offsetWidth ?? 0,
      );
      const total = boxes.reduce((a, b) => a + b, 0);
      const word = glyphs.reduce((a, b) => a + b, 0);
      let boxLeft = 0;
      let glyphLeft = (total - word) / 2;
      setShift(
        boxes.map((box, i) => {
          const d = glyphLeft + glyphs[i]! / 2 - (boxLeft + box / 2);
          boxLeft += box;
          glyphLeft += glyphs[i]!;
          return d;
        }),
      );
      setPhase('spinning');
      const land = Math.max(...REEL_MS) + 60;
      at(land, () => setPhase('landed'));
      at(land + CLOSE_MS + HOLD_MS, () => setLeaving(true));
      at(land + CLOSE_MS + HOLD_MS + FADE_MS, onDone);
    });
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [onDone]);

  return (
    <div
      className="pk-intro fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 bg-bg px-4 text-center"
      data-leaving={leaving}
      data-phase={phase}
      data-testid="intro"
      onClick={onDone}
    >
      <img src={brand.logo} alt="" width={72} height={72} className="pk-pop size-[72px]" />
      <div aria-hidden className="pk-word" data-run={phase !== 'waiting'}>
        {MALAYALAM.map((ml, i) => (
          <span
            key={ml}
            ref={(el) => {
              reels.current[i] = el;
            }}
            className="pk-reel"
            style={{ transform: phase === 'landed' ? `translateX(${shift[i]}px)` : undefined }}
          >
            <span
              className="pk-strip"
              style={{ '--dur': `${REEL_MS[i]}ms`, '--rows': REEL_SCRIPTS.length } as CSSProperties}
            >
              {REEL_SCRIPTS.map((r) => (
                <span
                  key={r.lang}
                  className="pk-cell"
                  lang={r.lang}
                  style={{ fontFamily: `'${introFamily(r.family)}', system-ui, sans-serif` }}
                >
                  {r.syllables[i]}
                </span>
              ))}
              <span className="pk-cell" lang="ml">
                {ml}
              </span>
            </span>
          </span>
        ))}
      </div>
      <p lang="en" className="pk-fade text-h3 font-semibold" data-show={phase === 'landed'}>
        {brand.name.en}
      </p>
      <p className="pk-fade text-small text-text-muted" data-show={phase === 'landed'}>
        {t('intro.tagline')}
      </p>
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
