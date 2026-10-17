import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cx } from './cx.ts';

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
};

export function TextField({ label, hint, error, className, type = 'text', id, ...rest }: TextFieldProps) {
  const { t } = useTranslation();
  const autoId = useId();
  const inputId = id ?? autoId;
  const [reveal, setReveal] = useState(false);
  const isPassword = type === 'password';
  const describedBy = [hint && `${inputId}-hint`, error && `${inputId}-error`].filter(Boolean).join(' ');

  return (
    <div className={cx('flex flex-col gap-1', className)}>
      <label htmlFor={inputId} className="text-small font-bold">
        {label}
      </label>
      {hint && (
        <p id={`${inputId}-hint`} className="text-small text-text-muted">
          {hint}
        </p>
      )}
      <div className="relative">
        <input
          id={inputId}
          type={isPassword && reveal ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={cx(
            'min-h-[52px] w-full rounded-sm border-2 bg-surface px-3 text-body text-text placeholder:text-text-muted',
            'focus-visible:border-focus',
            error ? 'border-danger' : 'border-border-strong',
            isPassword && 'pr-14',
          )}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setReveal((r) => !r)}
            className="absolute inset-y-0 right-0 flex min-w-tap items-center justify-center text-text-muted"
            aria-label={reveal ? t('form.hidePassword') : t('form.showPassword')}
            aria-pressed={reveal}
          >
            {reveal ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
          </button>
        )}
      </div>
      {error && (
        <p id={`${inputId}-error`} className="flex items-start gap-1 text-small text-danger" role="alert">
          <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
