import { cx } from './cx.ts';

const SIZES = { sm: 40, md: 56, lg: 88 } as const;

type StickerProps = {
  /** File name in public/stickers (see scripts/stickers.json), e.g. "coconut". */
  slug: string;
  size?: keyof typeof SIZES | number;
  /** Slight rotation, like a sticker slapped on by hand. */
  tilt?: number;
  /** Decorative by default; pass alt when the sticker alone carries meaning. */
  alt?: string;
  className?: string;
};

export function Sticker({ slug, size = 'md', tilt = 0, alt = '', className }: StickerProps) {
  const px = typeof size === 'number' ? size : SIZES[size];
  return (
    <img
      src={`/stickers/${slug}.webp`}
      width={px}
      height={px}
      alt={alt}
      loading="lazy"
      decoding="async"
      draggable={false}
      className={cx('sticker shrink-0', className)}
      style={tilt ? { rotate: `${tilt}deg` } : undefined}
    />
  );
}

/** A row of overlapping, alternately tilted stickers (cards, empty states). */
export function StickerRow({
  slugs,
  size = 'md',
  max = 5,
}: {
  slugs: string[];
  size?: StickerProps['size'];
  max?: number;
}) {
  const shown = slugs.slice(0, max);
  const extra = slugs.length - shown.length;
  return (
    <div className="flex items-center justify-center gap-1" aria-hidden>
      {shown.map((slug, i) => (
        <Sticker key={`${slug}-${i}`} slug={slug} size={size} tilt={i % 2 ? 5 : -6} />
      ))}
      {extra > 0 && (
        <span className="flex size-10 items-center justify-center rounded-pill bg-surface-sunken text-small font-semibold text-text-muted">
          +{extra}
        </span>
      )}
    </div>
  );
}
