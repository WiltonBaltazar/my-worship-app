import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import type { UnavailableDate, UnavailablePeriod } from '@/lib/availability';
import { useToast } from '@/hooks/use-toast';
import type { Ministry } from '@/lib/ministry';

export type HomeGroup = 'GHH' | 'GHS' | 'GHJ' | 'GHC';

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  phone: string | null;
  home_group: HomeGroup | null;
  in_dms: boolean;
  leads_dms: boolean;
  leads_ghj: boolean;
  can_lead: boolean;
  can_be_tech_lead: boolean;
  can_be_tech_sound: boolean;
  can_be_tech_streaming: boolean;
  is_active: boolean;
  is_approved: boolean;
  role?: 'admin' | 'leader' | 'member' | 'sound_tech' | null;
  created_at: string;
  updated_at: string;
  instruments?: string[];
  voices?: string[];
  unavailable_dates?: UnavailableDate[];
  unavailable_periods?: UnavailablePeriod[];
  is_paused?: boolean;
  /** Ministry the pause applies to; null when it covers every ministry. */
  pause_ministry?: Ministry | null;
  paused_at?: string | null;
}

interface ProfileFilters {
  status?: 'approved' | 'pending' | 'all';
  activity?: 'active' | 'inactive' | 'all';
  ministry?: Ministry;
  enabled?: boolean;
}

export function useProfilesByFilters({
  status = 'approved',
  activity = 'active',
  ministry,
  enabled = true,
}: ProfileFilters = {}) {
  return useQuery({
    queryKey: ['profiles', status, activity, ministry ?? 'all'],
    enabled,
    queryFn: async () => {
      const params = new URLSearchParams({
        status,
        activity,
        ...(ministry ? { ministry } : {}),
      });

      return apiRequest<Profile[]>(`/api/profiles?${params.toString()}`);
    },
  });
}

export function useProfiles({ ministry, enabled }: { ministry?: Ministry; enabled?: boolean } = {}) {
  return useProfilesByFilters({
    status: 'approved',
    activity: 'active',
    ministry,
    enabled,
  });
}

export function usePendingProfiles(isAdmin = false) {
  return useProfilesByFilters({
    status: 'pending',
    activity: 'active',
    enabled: isAdmin,
  });
}

export function usePendingProfilesCount(userId?: string, canManagePendingApprovals = false) {
  return useQuery({
    queryKey: ['profiles', 'pending-count', userId],
    enabled: canManagePendingApprovals && !!userId,
    queryFn: async () => {
      if (!userId) {
        return 0;
      }

      const response = await apiRequest<{ count: number }>('/api/profiles/pending-count');
      return response.count ?? 0;
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      profileId, 
      updates, 
      instruments, 
      voices,
      unavailableDates,
      unavailablePeriods,
      isPaused,
      pauseMinistry,
    }: {
      profileId: string; 
      updates: Partial<Profile>; 
      instruments?: string[];
      voices?: string[];
      unavailableDates?: UnavailableDate[];
      unavailablePeriods?: UnavailablePeriod[];
      isPaused?: boolean;
      /** Ministry to pause or resume; omitted means every ministry. */
      pauseMinistry?: Ministry | null;
      /** Toast title on success; defaults to "Perfil atualizado!". */
      successTitle?: string;
    }) => {
      return apiRequest<Profile>(`/api/profiles/${profileId}`, {
        method: 'PATCH',
        body: {
          ...updates,
          ...(instruments !== undefined ? { instruments } : {}),
          ...(voices !== undefined ? { voices } : {}),
          ...(unavailableDates !== undefined ? { unavailable_dates: unavailableDates } : {}),
          ...(unavailablePeriods !== undefined ? { unavailable_periods: unavailablePeriods } : {}),
          ...(isPaused !== undefined ? { is_paused: isPaused } : {}),
          ...(pauseMinistry ? { pause_ministry: pauseMinistry } : {}),
        },
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['profiles', 'pending-count'] });
      toast({ title: variables.successTitle ?? 'Perfil atualizado!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao atualizar perfil', description: error.message, variant: 'destructive' });
    }
  });
}

export function useDeleteProfile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (profileId: string) => {
      return apiRequest<{ message: string }>(`/api/profiles/${profileId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['profiles', 'pending-count'] });
      toast({ title: 'Membro removido!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao remover membro', description: error.message, variant: 'destructive' });
    }
  });
}

export function useSetTemporaryPassword() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (profileId: string) => {
      return apiRequest<{ message: string; temporary_password: string }>(
        `/api/profiles/${profileId}/temporary-password`,
        { method: 'POST' },
      );
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao definir senha temporária', description: error.message, variant: 'destructive' });
    }
  });
}

export function useApproveProfile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (profileId: string) => {
      return apiRequest<Profile>(`/api/profiles/${profileId}`, {
        method: 'PATCH',
        body: {
          is_approved: true,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['profiles', 'pending'] });
      queryClient.invalidateQueries({ queryKey: ['profiles', 'pending-count'] });
      toast({ title: 'Solicitação aprovada!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao aprovar solicitação', description: error.message, variant: 'destructive' });
    }
  });
}
