import { useId, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { cx } from './cx.ts';

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: ReactNode;
  hint?: ReactNode;
  srOnlyLabel?: boolean;
};

export function TextArea({
  label,
  hint,
  srOnlyLabel = false,
  className,
  id,
  rows = 3,
  ...rest
}: TextAreaProps) {
  const autoId = useId();
  const areaId = id ?? autoId;
  return (
    <div className={cx('flex flex-col gap-1', className)}>
      <label htmlFor={areaId} className={srOnlyLabel ? 'sr-only' : 'text-small font-bold'}>
        {label}
      </label>
      {hint && <p className="text-small text-text-muted">{hint}</p>}
      <textarea
        id={areaId}
        rows={rows}
        className="w-full resize-y rounded-md border-[1.5px] border-border bg-surface px-4 py-3 text-body text-text placeholder:text-text-muted focus-visible:border-border-strong"
        {...rest}
      />
    </div>
  );
}
