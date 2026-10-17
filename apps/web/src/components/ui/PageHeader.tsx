import type { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { IconButton } from './IconButton.tsx';
import { Headline } from './Headline.tsx';

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
      {(back || actions) && (
        <div className="flex items-center justify-between">
          {back ? (
            <IconButton
              label={t('actions.back')}
              icon={<ChevronLeft aria-hidden />}
              onClick={() => navigate(-1)}
            />
          ) : (
            <span />
          )}
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      )}
      <Headline soft={soft}>{title}</Headline>
    </header>
  );
}
