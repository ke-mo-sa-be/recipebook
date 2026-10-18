import { cx } from './cx.ts';
import { photoUrl } from '../../features/media/api.ts';

/** Profile photo, or the person's initial in a turmeric circle. */
export function Avatar({
  name,
  path,
  size = 44,
  className,
}: {
  name: string;
  path?: string | null;
  size?: number;
  className?: string;
}) {
  if (path) {
    return (
      <img
        src={photoUrl(path, size > 120 ? 800 : 400)}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        className={cx('shrink-0 rounded-pill object-cover', className)}
        style={{ width: size, height: size }}
      />
    );
  }
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
