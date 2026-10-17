import type { ReactNode } from 'react';
import { brand } from '../../brand/brand.ts';
import { currentLang } from '../../i18n/index.ts';

export function AuthLayout({
  title,
  intro,
  children,
}: {
  title: ReactNode;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 py-4">
      <div className="flex items-center gap-3">
        <img src={brand.logo} alt="" className="size-12" />
        <span className="text-h3">{brand.name[currentLang()]}</span>
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="text-h1">{title}</h1>
        {intro && <p className="text-lead text-text-muted">{intro}</p>}
      </div>
      {children}
    </div>
  );
}
