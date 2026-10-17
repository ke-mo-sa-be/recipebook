import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cx } from './cx.ts';

export type ButtonVariant = 'primary' | 'secondary' | 'soft' | 'danger' | 'ghost';

// v2: pills. One black primary per screen; everything else is quiet.
const variants: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-hover min-h-[54px] font-semibold',
  secondary: 'bg-surface text-text border border-border hover:bg-surface-sunken min-h-tap font-semibold',
  soft: 'bg-surface-sunken text-text hover:brightness-95 min-h-tap font-semibold',
  danger: 'bg-danger text-on-danger hover:brightness-95 min-h-tap font-semibold',
  ghost:
    'text-text underline underline-offset-4 decoration-border-strong hover:decoration-text min-h-tap font-semibold',
};

// Shared so links styled as buttons (e.g. <Link className={buttonClass('primary')}>) match exactly.
export function buttonClass(variant: ButtonVariant = 'primary', full = false) {
  return cx(
    'inline-flex items-center justify-center gap-2 rounded-pill px-6 text-center transition-transform active:scale-[0.98] [&>svg]:size-5',
    'disabled:cursor-not-allowed disabled:opacity-45',
    variants[variant],
    full && 'w-full',
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  full?: boolean;
  loading?: boolean;
  icon?: ReactNode;
};

export function Button({
  variant = 'primary',
  full = false,
  loading = false,
  icon,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(buttonClass(variant, full), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Loader2 aria-hidden className="size-5 animate-spin" /> : icon}
      <span>{children}</span>
    </button>
  );
}
