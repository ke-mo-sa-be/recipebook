import { useTranslation } from 'react-i18next';
import { Sheet } from '../../components/ui/Sheet.tsx';
import { Headline } from '../../components/ui/Headline.tsx';
import { Sticker } from '../../components/ui/Sticker.tsx';
import { ProfileFields } from '../profile/ProfileFields.tsx';
import type { Profile } from '../profile/api.ts';

/** First sign-in: confirm the suggested handle and name (sets profiles.onboarded_at). */
export function OnboardingSheet({ profile }: { profile: Profile }) {
  const { t } = useTranslation();
  return (
    <Sheet labelledBy="onboarding-title">
      <div className="flex flex-col gap-4">
        <div className="flex items-end justify-center" aria-hidden>
          <Sticker slug="sparkles" size={60} tilt={-8} />
          <Sticker slug="cooking" size={84} tilt={4} className="-ml-2" />
        </div>
        <Headline as="h2" id="onboarding-title" soft={t('onboarding.soft')}>
          {t('onboarding.title', { name: profile.display_name })}
        </Headline>
        <p className="text-text-muted">{t('onboarding.body')}</p>
        <ProfileFields profile={profile} withBio={false} markOnboarded submitLabel={t('onboarding.done')} />
      </div>
    </Sheet>
  );
}
