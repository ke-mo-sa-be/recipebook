import { cx } from './cx.ts';

/** Initial in a turmeric circle. Photo avatars arrive with the image pipeline (M2). */
export function Avatar({ name, size = 44, className }: { name: string; size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-pill bg-[#F6C445] font-bold text-[#1C1208]',
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
    >
      {Array.from(name.trim())[0]?.toUpperCase() ?? '?'}
    </span>
  );
}
