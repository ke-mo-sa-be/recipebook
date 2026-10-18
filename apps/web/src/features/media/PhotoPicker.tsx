import { useId, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, Loader2 } from 'lucide-react';
import { errorKey } from '../../lib/appError.ts';
import { cx } from '../../components/ui/cx.ts';

/**
 * A button that opens the phone's camera or gallery. On Android, accept="image/*" offers both.
 * Calls onPick with the chosen file and shows progress and plain-language errors.
 */
export function PhotoPicker({
  label,
  onPick,
  className,
  children,
}: {
  label: ReactNode;
  onPick: (file: File) => Promise<unknown>;
  className?: string;
  children?: ReactNode;
}) {
  const { t } = useTranslation();
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      await onPick(file);
    } catch (err) {
      setError(errorKey(err, 'media.errors.uploadFailed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      {/* Visually hidden but focusable: keyboard users open it with Enter or Space. */}
      <input id={id} type="file" accept="image/*" className="sr-only" onChange={onChange} disabled={busy} />
      <label
        htmlFor={id}
        aria-busy={busy || undefined}
        className={cx(
          'inline-flex min-h-tap cursor-pointer items-center justify-center gap-2 rounded-pill bg-surface-sunken px-5 font-semibold',
          'has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-focus',
          busy && 'cursor-wait opacity-70',
          className,
        )}
      >
        {busy ? (
          <Loader2 aria-hidden className="size-5 animate-spin" />
        ) : (
          <Camera aria-hidden className="size-5" />
        )}
        <span>{busy ? t('media.uploading') : label}</span>
      </label>
      {children}
      {error && (
        <p role="alert" className="text-small text-danger">
          {t(error)}
        </p>
      )}
    </div>
  );
}
