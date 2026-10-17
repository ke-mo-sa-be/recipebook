import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router';
import { cx } from './cx.ts';

const base =
  'inline-flex size-[44px] shrink-0 items-center justify-center rounded-pill shadow-sm transition-transform active:scale-95 [&>svg]:size-5';
const tones = {
  surface: 'bg-surface text-text',
  dark: 'bg-primary text-on-primary',
};

type Common = { label: string; icon: ReactNode; tone?: keyof typeof tones; className?: string };

/** Round icon-only button for universal actions (back, close, share, save). Always has an aria-label. */
export function IconButton({
  label,
  icon,
  tone = 'surface',
  className,
  type = 'button',
  ...rest
}: Common & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'>) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cx(base, tones[tone], className)}
      {...rest}
    >
      {icon}
    </button>
  );
}

export function IconLink({ label, icon, tone = 'surface', className, to }: Common & { to: string }) {
  return (
    <Link to={to} aria-label={label} title={label} className={cx(base, tones[tone], className)}>
      {icon}
    </Link>
  );
}
