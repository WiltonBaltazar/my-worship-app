import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import type { Ministry } from '@/lib/ministry';

export interface ScheduleMember {
  id: string;
  profile_id: string;
  function_type: 'lead_vocal' | 'backing_vocal' | 'instrumentalist' | 'sound_tech';
  function_detail: string | null;
  confirmed: boolean;
  can_edit: boolean;
  requested_change: boolean;
  change_reason: string | null;
  suggested_substitute_id: string | null;
  pending_substitute_requests?: Array<{
    id: string;
    candidate_profile: {
      id: string;
      name: string;
      avatar_url: string | null;
    } | null;
  }>;
  profile?: {
    id: string;
    name: string;
    avatar_url: string | null;
    user_id?: string;
  };
}

export interface ScheduleSong {
  id: string;
  song_id: string;
  order_position: number;
  notes: string | null;
  song?: {
    id: string;
    title: string;
    artist: string | null;
  };
}

export interface ScheduleGuest {
  id: string;
  /** Set when the presenter is a registered member. */
  profile_id: string | null;
  name: string;
  avatar_url: string | null;
  role: string;
  song_title: string | null;
  song_url: string | null;
  notes: string | null;
  order_position: number;
}

export interface Schedule {
  id: string;
  schedule_date: string;
  start_time: string;
  status: 'draft' | 'published' | 'confirmed';
  schedule_type: 'worship' | 'rehearsal';
  ministry: Ministry;
  title: string | null;
  notes: string | null;
  availability_call: { is_open: boolean; deadline: string | null } | null;
  created_at: string;
  updated_at: string;
  members?: ScheduleMember[];
  guests?: ScheduleGuest[];
  songs?: ScheduleSong[];
}

function normalizeTime(value?: string | null): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return null;
  }

  return /^\d{2}:\d{2}$/.test(value) ? `${value}:00` : value;
}

function normalizeSchedulePayload<T extends Record<string, any>>(payload: T): T {
  if (!('start_time' in payload)) {
    return payload;
  }

  return {
    ...payload,
    start_time: normalizeTime(payload.start_time),
  };
}

function resolveScheduleMemberId(
  queryClient: ReturnType<typeof useQueryClient>,
  scheduleId: string,
  profileId: string,
): string {
  const directSchedules = queryClient.getQueryData<Schedule[]>(['schedules']) ?? [];
  const myScheduleQueries = queryClient.getQueriesData<Schedule[]>({
    queryKey: ['my-schedules'],
  });
  const mySchedules = myScheduleQueries.flatMap(([, data]) => data ?? []);
  const allSchedules = [...directSchedules, ...mySchedules];

  for (const schedule of allSchedules) {
    if (schedule.id !== scheduleId) {
      continue;
    }

    const member = schedule.members?.find((item) => item.profile_id === profileId);

    if (member?.id) {
      return member.id;
    }
  }

  throw new Error('Membro da escala não encontrado. Recarregue e tente novamente.');
}

export function useSchedules() {
  return useQuery({
    queryKey: ['schedules'],
    queryFn: async () => {
      return apiRequest<Schedule[]>('/api/schedules');
    },
  });
}

export function useMySchedules(profileId: string | undefined) {
  return useQuery({
    queryKey: ['my-schedules', profileId],
    enabled: !!profileId,
    queryFn: async () => {
      if (!profileId) {
        return [];
      }

      return apiRequest<Schedule[]>('/api/schedules/me');
    },
  });
}

export function useCreateSchedule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (schedule: {
      schedule_date: string;
      start_time?: string;
      notes?: string;
      schedule_type?: 'worship' | 'rehearsal';
      ministry?: Ministry;
      title?: string;
      status?: 'draft' | 'published' | 'confirmed';
    }) => {
      return apiRequest<Schedule>('/api/schedules', {
        method: 'POST',
        body: normalizeSchedulePayload(schedule),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      const typeLabel = variables.schedule_type === 'rehearsal' ? 'Ensaio criado!' : 'Escala criada!';
      toast({ title: typeLabel });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao criar', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Schedule> & { id: string }) => {
      return apiRequest<Schedule>(`/api/schedules/${id}`, {
        method: 'PATCH',
        body: normalizeSchedulePayload(updates),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['my-schedules'] });
      toast({ title: 'Escala atualizada!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao atualizar escala', description: error.message, variant: 'destructive' });
    },
  });
}

/**
 * Publishes a draft, refusing (with an explanation) when nobody is on the team yet —
 * a published schedule with no members would notify no one.
 */
export function usePublishSchedule() {
  const updateScheduleMutation = useUpdateSchedule();
  const { toast } = useToast();

  const publish = async (schedule: Schedule) => {
    if ((schedule.members ?? []).length === 0) {
      toast({
        title: 'Adicione membros antes de publicar',
        description: 'Use "Editar" para escalar a equipe ou abra uma convocatória.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await updateScheduleMutation.mutateAsync({ id: schedule.id, status: 'published' });
    } catch {
      // Toast is handled by useUpdateSchedule.
    }
  };

  return { publish, isPending: updateScheduleMutation.isPending };
}

export function useUpdateScheduleNotes() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string | null }) => {
      return apiRequest<Schedule>(`/api/schedules/${id}/notes`, {
        method: 'PATCH',
        body: { notes },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['my-schedules'] });
      toast({ title: 'Observações salvas!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao salvar observações', description: error.message, variant: 'destructive' });
    },
  });
}

export function useAddScheduleMember() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (member: {
      schedule_id: string;
      profile_id: string;
      function_type: 'lead_vocal' | 'backing_vocal' | 'instrumentalist';
      function_detail?: string;
      confirmed?: boolean;
      can_edit?: boolean;
    }) => {
      return apiRequest<ScheduleMember>(`/api/schedules/${member.schedule_id}/members`, {
        method: 'POST',
        body: {
          profile_id: member.profile_id,
          function_type: member.function_type,
          function_detail: member.function_detail,
          confirmed: member.confirmed ?? true,
          can_edit: member.can_edit ?? false,
        },
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['my-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['availability-responses', variables.schedule_id] });
      toast({ title: 'Membro adicionado à escala!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao adicionar membro', description: error.message, variant: 'destructive' });
    },
  });
}

export function useConfirmSchedule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      scheduleId,
      profileId,
      confirmed,
    }: {
      scheduleId: string;
      profileId: string;
      confirmed: boolean;
    }) => {
      const memberId = resolveScheduleMemberId(queryClient, scheduleId, profileId);

      return apiRequest<ScheduleMember>(`/api/schedule-members/${memberId}`, {
        method: 'PATCH',
        body: {
          confirmed,
          requested_change: false,
          change_reason: null,
          suggested_substitute_id: null,
        },
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['my-schedules'] });
      toast({ title: variables.confirmed ? 'Presença confirmada!' : 'Confirmação removida' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });
}

export function useRequestChange() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      scheduleId,
      profileId,
      reason,
      substituteId,
    }: {
      scheduleId: string;
      profileId: string;
      reason: string;
      substituteId?: string;
    }) => {
      const memberId = resolveScheduleMemberId(queryClient, scheduleId, profileId);

      return apiRequest<ScheduleMember>(`/api/schedule-members/${memberId}`, {
        method: 'PATCH',
        body: {
          requested_change: true,
          change_reason: reason,
          suggested_substitute_id: substituteId ?? null,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['my-schedules'] });
      toast({ title: 'Solicitação enviada!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteSchedule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (scheduleId: string) => {
      return apiRequest<{ message: string }>(`/api/schedules/${scheduleId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['my-schedules'] });
      toast({ title: 'Escala excluída com sucesso!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao excluir escala', description: error.message, variant: 'destructive' });
    },
  });
}

export function useApproveSubstitute() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      scheduleId,
      originalMemberId,
      substituteId,
      functionType,
      functionDetail,
    }: {
      scheduleId: string;
      originalMemberId: string;
      substituteId: string;
      functionType: 'lead_vocal' | 'backing_vocal' | 'instrumentalist';
      functionDetail?: string | null;
    }) => {
      const memberId = resolveScheduleMemberId(queryClient, scheduleId, originalMemberId);

      await apiRequest<{ message: string }>(`/api/schedule-members/${memberId}`, {
        method: 'DELETE',
      });

      await apiRequest<ScheduleMember>(`/api/schedules/${scheduleId}/members`, {
        method: 'POST',
        body: {
          profile_id: substituteId,
          function_type: functionType,
          function_detail: functionDetail,
          confirmed: true,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['my-schedules'] });
      toast({ title: 'Substituição aprovada!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao aprovar substituição', description: error.message, variant: 'destructive' });
    },
  });
}

export function useRejectChangeRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      scheduleId,
      profileId,
    }: {
      scheduleId: string;
      profileId: string;
    }) => {
      const memberId = resolveScheduleMemberId(queryClient, scheduleId, profileId);

      return apiRequest<ScheduleMember>(`/api/schedule-members/${memberId}`, {
        method: 'PATCH',
        body: {
          requested_change: false,
          change_reason: null,
          suggested_substitute_id: null,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['my-schedules'] });
      toast({ title: 'Solicitação rejeitada' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });
}

export function useRemoveScheduleMember() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      scheduleId,
      profileId,
    }: {
      scheduleId: string;
      profileId: string;
    }) => {
      const memberId = resolveScheduleMemberId(queryClient, scheduleId, profileId);

      return apiRequest<{ message: string }>(`/api/schedule-members/${memberId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['my-schedules'] });
      toast({ title: 'Membro removido da escala' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao remover membro', description: error.message, variant: 'destructive' });
    },
  });
}

export function useRemoveScheduleMemberById() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (memberId: string) => {
      return apiRequest<{ message: string }>(`/api/schedule-members/${memberId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['my-schedules'] });
      toast({ title: 'Membro removido da escala' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao remover membro', description: error.message, variant: 'destructive' });
    },
  });
}

export function useSetScheduleMemberEditPermission() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      memberId,
      canEdit,
    }: {
      memberId: string;
      canEdit: boolean;
    }) => {
      return apiRequest<ScheduleMember>(`/api/schedule-members/${memberId}`, {
        method: 'PATCH',
        body: {
          can_edit: canEdit,
        },
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['my-schedules'] });
      toast({
        title: variables.canEdit ? 'Permissão de edição concedida' : 'Permissão de edição removida',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar permissão',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateScheduleMemberFunction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      memberId,
      function_type,
      function_detail,
    }: {
      memberId: string;
      function_type: 'lead_vocal' | 'backing_vocal' | 'instrumentalist';
      function_detail: string | null;
    }) => {
      return apiRequest<ScheduleMember>(`/api/schedule-members/${memberId}`, {
        method: 'PATCH',
        body: { function_type, function_detail },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['my-schedules'] });
      toast({ title: 'Função atualizada!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao atualizar função', description: error.message, variant: 'destructive' });
    },
  });
}

export function useSyncScheduleSongs() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      scheduleId,
      songs,
    }: {
      scheduleId: string;
      songs: Array<{
        song_id: string;
        order_position?: number;
        notes?: string | null;
      }>;
    }) => {
      return apiRequest<Schedule>(`/api/schedules/${scheduleId}/songs`, {
        method: 'POST',
        body: { songs },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['my-schedules'] });
      toast({ title: 'Repertório atualizado!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao atualizar repertório', description: error.message, variant: 'destructive' });
    },
  });
}
