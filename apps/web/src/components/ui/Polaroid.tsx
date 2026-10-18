import { photoSrcSet, photoUrl } from '../../features/media/api.ts';
import { Sticker } from './Sticker.tsx';
import { cx } from './cx.ts';

const WARM = 'radial-gradient(circle at 30% 25%, #FBE3C2, #EDB27C 70%)';

/** A cook's photo as a tilted white "polaroid" sticker; without a photo, the dish sticker on a warm gradient. */
export function Polaroid({
  path,
  sticker,
  width = 156,
  tilt = 6,
  alt = '',
  className,
}: {
  path: string | null;
  sticker: string;
  width?: number;
  tilt?: number;
  alt?: string;
  className?: string;
}) {
  return (
    <div
      className={cx('shrink-0 rounded-[22px] bg-white p-[7px] shadow-lg', className)}
      style={{ width, rotate: `${tilt}deg` }}
    >
      <div
        className="aspect-square overflow-hidden rounded-[16px]"
        style={path ? undefined : { background: WARM }}
      >
        {path ? (
          <img
            src={photoUrl(path, 800)}
            srcSet={photoSrcSet(path)}
            sizes={`${width}px`}
            alt={alt}
            loading="lazy"
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <Sticker slug={sticker} size={Math.round(width * 0.62)} />
          </div>
        )}
      </div>
    </div>
  );
}
