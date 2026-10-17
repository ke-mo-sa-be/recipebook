import { useId, type ReactNode } from 'react';
import { cx } from './cx.ts';

type Choice<T extends string> = { value: T; label: ReactNode; lang?: string; className?: string };

type ChoiceGroupProps<T extends string> = {
  legend: ReactNode;
  value: T;
  choices: Array<Choice<T>>;
  onChange: (value: T) => void;
};

/** Segmented single choice, built on radio inputs so it works with keyboard and screen readers. */
export function ChoiceGroup<T extends string>({ legend, value, choices, onChange }: ChoiceGroupProps<T>) {
  const name = useId();
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-small font-bold">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {choices.map((c) => (
          <label
            key={c.value}
            lang={c.lang}
            className={cx(
              'flex min-h-tap min-w-[6.5rem] flex-1 cursor-pointer items-center justify-center rounded-lg border-2 px-3 py-1 text-center font-semibold',
              'has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus',
              value === c.value
                ? 'border-text bg-primary-soft text-on-primary-soft'
                : 'border-border-strong bg-surface text-text',
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
