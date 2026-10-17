import type { ReactNode } from 'react';
import { cx } from './cx.ts';

/**
 * The v2 two-tone headline: a statement in black, a continuation in soft grey.
 * Soft grey meets contrast only at large sizes, so this is always h1/display size.
 */
export function Headline({
  children,
  soft,
  size = 'h1',
  as: Tag = 'h1',
  className,
  id,
}: {
  children: ReactNode;
  soft?: ReactNode;
  size?: 'h1' | 'display';
  as?: 'h1' | 'h2';
  className?: string;
  id?: string;
}) {
  return (
    <Tag id={id} className={cx(size === 'display' ? 'text-h1 md:text-display' : 'text-h1', className)}>
      <span className="block">{children}</span>
      {soft && <span className="block text-text-soft">{soft}</span>}
    </Tag>
  );
}
