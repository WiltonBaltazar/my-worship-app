import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export interface SubstituteRequest {
  id: string;
  schedule_member_id: string;
  candidate_profile_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  responded_at: string | null;
  schedule_member?: {
    id: string;
    schedule_id: string;
    profile_id: string;
    function_type: string;
    function_detail: string | null;
    profile?: {
      id: string;
      name: string;
      avatar_url: string | null;
      user_id: string;
    };
    schedule?: {
      id: string;
      schedule_date: string;
      start_time: string | null;
      title: string | null;
    };
  };
  candidate_profile?: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
}

export function useMySubstituteRequests(userId?: string) {
  return useQuery({
    queryKey: ['substitute-requests', 'my', userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) {
        return [];
      }

      return apiRequest<SubstituteRequest[]>('/api/substitute-requests/my');
    },
  });
}

export function useCreateSubstituteRequests() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      scheduleMemberId,
      candidateProfileIds,
    }: {
      scheduleMemberId: string;
      candidateProfileIds: string[];
      requesterName: string;
      scheduleDate: string;
      scheduleId: string;
    }) => {
      return apiRequest<{ message: string }>('/api/substitute-requests', {
        method: 'POST',
        body: {
          schedule_member_id: scheduleMemberId,
          candidate_profile_ids: candidateProfileIds,
        },
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['substitute-requests'] });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['my-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });

      const description =
        variables.candidateProfileIds.length > 0
          ? 'Os membros selecionados foram notificados.'
          : 'A liderança foi notificada para escolher um substituto.';

      toast({ title: 'Solicitação enviada!', description });
    },
    onError: (error: any) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });
}

export function useCancelSubstituteRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (scheduleMemberId: string) => {
      return apiRequest<{ message: string }>(`/api/substitute-requests/member/${scheduleMemberId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['substitute-requests'] });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['my-schedules'] });
      toast({ title: 'Solicitação cancelada' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });
}

export function useAcceptSubstituteRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      requestId,
    }: {
      requestId: string;
      scheduleMemberId: string;
      candidateProfileId: string;
      candidateName: string;
      functionType: string;
      functionDetail: string | null;
    }) => {
      return apiRequest<{ message: string }>(`/api/substitute-requests/${requestId}/accept`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['substitute-requests'] });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['my-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({ title: 'Substituição aceita!', description: 'Você foi adicionado à escala.' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });
}

export function useRejectSubstituteRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      requestId,
    }: {
      requestId: string;
      candidateName: string;
    }) => {
      return apiRequest<{ message: string }>(`/api/substitute-requests/${requestId}/reject`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['substitute-requests'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({ title: 'Solicitação recusada' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });
}

export function usePendingSubstituteRequestsCount(userId?: string) {
  return useQuery({
    queryKey: ['substitute-requests', 'pending-count', userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) {
        return 0;
      }

      const response = await apiRequest<{ count: number }>('/api/substitute-requests/pending-count');
      return response.count ?? 0;
    },
  });
}
