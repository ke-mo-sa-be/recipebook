import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { District, Lang, ProfileUpdate } from '@recipebook/core';
import { supabase } from '../../lib/supabaseClient.ts';
import { AppError } from '../../lib/appError.ts';
import { useUserId } from '../auth/AuthProvider.tsx';

export type Profile = {
  id: string;
  handle: string;
  display_name: string;
  avatar_path: string | null;
  bio: string | null;
  district: District | null;
  preferred_lang: Lang;
  text_size: 'small' | 'normal' | 'large' | 'xl';
  onboarded_at: string | null;
  role: 'user' | 'moderator' | 'admin';
  status: 'active' | 'suspended';
  created_at: string;
};

const COLUMNS =
  'id, handle, display_name, avatar_path, bio, district, preferred_lang, text_size, onboarded_at, role, status, created_at';

export const profileKeys = {
  me: (uid: string | null) => ['profile', 'me', uid] as const,
  byHandle: (handle: string) => ['profile', 'handle', handle] as const,
};

export function useMyProfile() {
  const uid = useUserId();
  return useQuery({
    queryKey: profileKeys.me(uid),
    enabled: uid !== null,
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select(COLUMNS).eq('id', uid!).single();
      if (error) throw new AppError('errors.network', error);
      return data as Profile;
    },
  });
}

export function useProfileByHandle(handle: string) {
  return useQuery({
    queryKey: profileKeys.byHandle(handle),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(COLUMNS)
        .eq('handle', handle.toLowerCase())
        .maybeSingle();
      if (error) throw new AppError('errors.network', error);
      return data as Profile | null;
    },
  });
}

type ProfilePatch = Partial<ProfileUpdate> & { onboarded_at?: string };

export function useUpdateProfile() {
  const uid = useUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: ProfilePatch) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(patch)
        .eq('id', uid!)
        .select(COLUMNS)
        .single();
      if (error) {
        if (error.code === '23505') throw new AppError('profile.errors.handleTaken', error);
        if (error.code === '23514') throw new AppError('profile.errors.handle', error);
        // 0 rows updated (e.g. suspended account) surfaces as PGRST116 from .single()
        if (error.code === 'PGRST116') throw new AppError('profile.errors.cannotEdit', error);
        throw new AppError('errors.network', error);
      }
      return data as Profile;
    },
    onSuccess: (profile) => {
      qc.setQueryData(profileKeys.me(uid), profile);
      void qc.invalidateQueries({ queryKey: ['profile', 'handle'] });
    },
  });
}
