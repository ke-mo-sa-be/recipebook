import { Minus, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatAmount } from '@recipebook/core';

/** Big − value + control (56px buttons). Shows friendly fractions (½, ¼). */
export function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 9999,
  label,
  suffix,
  allowEmpty = false,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  step?: number | ((v: number, dir: 1 | -1) => number);
  min?: number;
  max?: number;
  label: string;
  suffix?: string;
  allowEmpty?: boolean;
}) {
  const { t } = useTranslation();
  const next = (dir: 1 | -1) => {
    const v = value ?? 0;
    const s = typeof step === 'function' ? step(v, dir) : step;
    const n = Math.round((v + dir * s) * 1000) / 1000;
    if (n < min) return onChange(allowEmpty ? null : min);
    onChange(Math.min(max, n));
  };
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex items-center rounded-[22px] bg-surface-sunken p-1"
    >
      <button
        type="button"
        onClick={() => next(-1)}
        aria-label={t('actions.decrease', { what: label })}
        className="flex size-[44px] items-center justify-center rounded-[18px] text-text hover:bg-surface"
      >
        <Minus aria-hidden className="size-5" />
      </button>
      <output
        aria-live="polite"
        className="min-w-[3.5rem] rounded-[18px] bg-surface px-2 py-2 text-center font-semibold shadow-sm"
      >
        {value == null ? '–' : formatAmount(value)}
        {suffix && value != null && (
          <span className="ml-1 text-small font-medium text-text-muted">{suffix}</span>
        )}
      </output>
      <button
        type="button"
        onClick={() => next(1)}
        aria-label={t('actions.increase', { what: label })}
        className="flex size-[44px] items-center justify-center rounded-[18px] text-text hover:bg-surface"
      >
        <Plus aria-hidden className="size-5" />
      </button>
    </div>
  );
}
