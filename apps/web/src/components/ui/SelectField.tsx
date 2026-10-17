import { useId, type ReactNode, type SelectHTMLAttributes } from 'react';
import { cx } from './cx.ts';

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: ReactNode;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
};

// Native <select>: on phones it opens the OS picker, which people already know how to use.
export function SelectField({ label, options, placeholder, className, id, ...rest }: SelectFieldProps) {
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <div className={cx('flex flex-col gap-1', className)}>
      <label htmlFor={selectId} className="text-small font-bold">
        {label}
      </label>
      <select
        id={selectId}
        className="min-h-[54px] w-full rounded-md border-[1.5px] border-border bg-surface px-4 text-body text-text focus-visible:border-border-strong"
        {...rest}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
