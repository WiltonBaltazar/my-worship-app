import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  phone: string | null;
  can_lead: boolean;
  is_active: boolean;
  is_approved: boolean;
  role?: 'admin' | 'leader' | 'member' | null;
  created_at: string;
  updated_at: string;
  instruments?: string[];
  voices?: string[];
  unavailable_dates?: string[];
}

interface ProfileFilters {
  status?: 'approved' | 'pending' | 'all';
  activity?: 'active' | 'inactive' | 'all';
  enabled?: boolean;
}

export function useProfilesByFilters({
  status = 'approved',
  activity = 'active',
  enabled = true,
}: ProfileFilters = {}) {
  return useQuery({
    queryKey: ['profiles', status, activity],
    enabled,
    queryFn: async () => {
      const params = new URLSearchParams({
        status,
        activity,
      });

      return apiRequest<Profile[]>(`/api/profiles?${params.toString()}`);
    },
  });
}

export function useProfiles() {
  return useProfilesByFilters({
    status: 'approved',
    activity: 'active',
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
    }: { 
      profileId: string; 
      updates: Partial<Profile>; 
      instruments?: string[];
      voices?: string[];
      unavailableDates?: string[];
    }) => {
      return apiRequest<Profile>(`/api/profiles/${profileId}`, {
        method: 'PATCH',
        body: {
          ...updates,
          ...(instruments !== undefined ? { instruments } : {}),
          ...(voices !== undefined ? { voices } : {}),
          ...(unavailableDates !== undefined ? { unavailable_dates: unavailableDates } : {}),
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['profiles', 'pending-count'] });
      toast({ title: 'Perfil atualizado!' });
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
