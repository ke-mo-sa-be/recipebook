import { useId, type FormEvent, type ReactNode } from 'react';
import { ArrowUp } from 'lucide-react';
import { cx } from './cx.ts';

type ComposerProps = {
  label: string;
  placeholder: string;
  submitLabel: string;
  defaultValue?: string;
  onSubmit: (value: string) => void;
  /** Left side of the bottom row (e.g. a grey action pill or a status line). */
  extra?: ReactNode;
  className?: string;
  compact?: boolean;
};

/** The v2 search / describe card: a big text field, extras on the left, a black send button. */
export function Composer({
  label,
  placeholder,
  submitLabel,
  defaultValue,
  onSubmit,
  extra,
  className,
  compact = false,
}: ComposerProps) {
  const id = useId();
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = String(new FormData(e.currentTarget).get('q') ?? '').trim();
    onSubmit(value);
  }
  return (
    <form
      role="search"
      onSubmit={submit}
      className={cx('card shadow-md', compact ? 'px-3.5 py-3' : 'p-3.5', className)}
    >
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        name="q"
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full bg-transparent px-1 pt-1 pb-3 text-lead text-text outline-none placeholder:text-text-muted"
      />
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">{extra}</div>
        <button
          type="submit"
          aria-label={submitLabel}
          title={submitLabel}
          className="inline-flex size-[44px] shrink-0 items-center justify-center rounded-pill bg-primary text-on-primary transition-transform active:scale-95"
        >
          <ArrowUp aria-hidden className="size-5" />
        </button>
      </div>
    </form>
  );
}
