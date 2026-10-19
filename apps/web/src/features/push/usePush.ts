import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useUserId } from '../auth/AuthProvider.tsx';
import { disablePush, enablePush, pushState, type PushState } from './push.ts';

export function usePush() {
  const uid = useUserId();
  const qc = useQueryClient();
  const key = ['push-state', uid];
  const state = useQuery({ queryKey: key, enabled: Boolean(uid), queryFn: pushState, staleTime: 30_000 });
  const toggle = useMutation({
    mutationFn: (on: boolean) => (on ? enablePush() : disablePush()),
    onSuccess: (next: PushState) => qc.setQueryData(key, next),
  });
  return { state: state.data, toggle };
}
