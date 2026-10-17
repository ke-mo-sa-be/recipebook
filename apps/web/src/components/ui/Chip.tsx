import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Sticker } from './Sticker.tsx';
import { cx } from './cx.ts';

type ChipProps = {
  children: ReactNode;
  active?: boolean;
  sticker?: string;
  count?: number;
  lang?: string;
  className?: string;
} & ({ to: string; onClick?: never } | { to?: never; onClick?: () => void });

/** Pill chip. Active = black. Renders a link (navigation) or a toggle button (aria-pressed). */
export function Chip({ children, active = false, sticker, count, lang, className, to, onClick }: ChipProps) {
  const cls = cx(
    'inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-pill border px-3.5 text-small font-medium whitespace-nowrap transition-colors',
    active
      ? 'border-primary bg-primary text-on-primary'
      : 'border-border bg-surface text-text hover:bg-surface-sunken',
    sticker && 'pl-1.5',
    className,
  );
  const inner = (
    <>
      {sticker && <Sticker slug={sticker} size={26} />}
      <span lang={lang}>{children}</span>
      {count !== undefined && (
        <span
          className={cx(
            'rounded-pill px-1.5 text-[11px] font-semibold',
            active ? 'bg-on-primary/20' : 'bg-surface-sunken',
          )}
        >
          {count}
        </span>
      )}
    </>
  );
  if (to) {
    return (
      <Link to={to} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}
