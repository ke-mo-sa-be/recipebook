import type { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { IconButton } from './IconButton.tsx';
import { Headline } from './Headline.tsx';
import { ThemeToggle } from './ThemeToggle.tsx';
import { cx } from './cx.ts';

/** v2 page top: round back button and optional actions, then a two-tone headline. */
export function PageHeader({
  title,
  soft,
  back = false,
  actions,
}: {
  title: ReactNode;
  soft?: ReactNode;
  back?: boolean;
  actions?: ReactNode;
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <header className="flex flex-col gap-4 pb-5">
      {/* Phones always get the top row for the theme switch; desktop has it in the top bar. */}
      <div className={cx('flex items-center justify-between', !(back || actions) && 'lg:hidden')}>
        {back ? (
          <IconButton
            label={t('actions.back')}
            icon={<ChevronLeft aria-hidden />}
            onClick={() => navigate(-1)}
          />
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          {actions}
          <span className="lg:hidden">
            <ThemeToggle />
          </span>
        </div>
      </div>
      <Headline soft={soft}>{title}</Headline>
    </header>
  );
}
