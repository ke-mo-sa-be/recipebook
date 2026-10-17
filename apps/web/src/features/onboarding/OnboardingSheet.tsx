import { useTranslation } from 'react-i18next';
import { Sheet } from '../../components/ui/Sheet.tsx';
import { ProfileFields } from '../profile/ProfileFields.tsx';
import type { Profile } from '../profile/api.ts';

/** First sign-in: confirm the suggested handle and name (sets profiles.onboarded_at). */
export function OnboardingSheet({ profile }: { profile: Profile }) {
  const { t } = useTranslation();
  return (
    <Sheet labelledBy="onboarding-title">
      <div className="flex flex-col gap-4">
        <h2 id="onboarding-title" className="text-h2">
          {t('onboarding.title', { name: profile.display_name })}
        </h2>
        <p className="text-text-muted">{t('onboarding.body')}</p>
        <ProfileFields profile={profile} withBio={false} markOnboarded submitLabel={t('onboarding.done')} />
      </div>
    </Sheet>
  );
}
