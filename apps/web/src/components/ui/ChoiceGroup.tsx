import { useId, type ReactNode } from 'react';
import { cx } from './cx.ts';

type Choice<T extends string> = { value: T; label: ReactNode; lang?: string; className?: string };

type ChoiceGroupProps<T extends string> = {
  legend: ReactNode;
  value: T;
  choices: Array<Choice<T>>;
  onChange: (value: T) => void;
};

/** v2 segmented control (grey track, white raised thumb), built on radio inputs for keyboard and screen readers. */
export function ChoiceGroup<T extends string>({ legend, value, choices, onChange }: ChoiceGroupProps<T>) {
  const name = useId();
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-small font-bold">{legend}</legend>
      <div className="flex flex-wrap gap-1 rounded-[22px] bg-surface-sunken p-1">
        {choices.map((c) => (
          <label
            key={c.value}
            lang={c.lang}
            className={cx(
              'flex min-h-tap min-w-[6.5rem] flex-1 cursor-pointer items-center justify-center rounded-[18px] px-3 py-1 text-center font-medium transition-colors',
              'has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus',
              value === c.value ? 'bg-surface text-text shadow-sm' : 'text-text-muted hover:text-text',
              c.className,
            )}
          >
            <input
              type="radio"
              name={name}
              value={c.value}
              checked={value === c.value}
              onChange={() => onChange(c.value)}
              className="sr-only"
            />
            {c.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
