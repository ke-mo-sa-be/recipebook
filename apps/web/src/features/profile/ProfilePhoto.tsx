import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Avatar } from '../../components/ui/Avatar.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { PhotoPicker } from '../media/PhotoPicker.tsx';
import { removePhoto, uploadPhoto } from '../media/api.ts';
import type { Profile } from './api.ts';

/** Profile photo with Change / Remove. The photo goes through the server pipeline (no EXIF/GPS). */
export function ProfilePhoto({ profile }: { profile: Profile }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ['profile'] });
  return (
    <div className="flex items-center gap-4">
      <Avatar name={profile.display_name} path={profile.avatar_path} size={72} />
      <div className="flex flex-wrap items-center gap-2">
        <PhotoPicker
          label={profile.avatar_path ? t('profile.photo.change') : t('profile.photo.add')}
          onPick={async (file) => {
            await uploadPhoto(file, { purpose: 'avatar' });
            await refresh();
          }}
        />
        {profile.avatar_path && (
          <Button
            variant="ghost"
            onClick={async () => {
              await removePhoto({ purpose: 'avatar' });
              await refresh();
            }}
          >
            {t('profile.photo.remove')}
          </Button>
        )}
      </div>
    </div>
  );
}
