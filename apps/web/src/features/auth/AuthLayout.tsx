import type { ReactNode } from 'react';
import { Headline } from '../../components/ui/Headline.tsx';
import { Sticker } from '../../components/ui/Sticker.tsx';

const CLUSTER = [
  { slug: 'pancakes', size: 76, tilt: -8 },
  { slug: 'steaming-bowl', size: 92, tilt: 5 },
  { slug: 'teacup-without-handle', size: 72, tilt: 9 },
];

/** v2 auth screens: a friendly sticker cluster, a two-tone headline, then the form. */
export function AuthLayout({
  title,
  soft,
  intro,
  stickers = CLUSTER,
  children,
}: {
  title: ReactNode;
  soft?: ReactNode;
  intro?: ReactNode;
  stickers?: typeof CLUSTER;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 pt-2">
      <div className="flex items-end justify-center" aria-hidden>
        {stickers.map((s, i) => (
          <Sticker
            key={s.slug}
            slug={s.slug}
            size={s.size}
            tilt={s.tilt}
            className={i ? '-ml-3' : undefined}
          />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <Headline soft={soft}>{title}</Headline>
        {intro && <p className="text-text-muted">{intro}</p>}
      </div>
      {children}
    </div>
  );
}
