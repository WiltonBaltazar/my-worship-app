import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import type { ScheduleGuest } from '@/hooks/useSchedules';

export interface ScheduleGuestInput {
  profile_id?: string | null;
  name?: string | null;
  role: string;
  song_title?: string | null;
  song_url?: string | null;
  notes?: string | null;
}

function useInvalidateSchedules() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: ['schedules'] });
    queryClient.invalidateQueries({ queryKey: ['my-schedules'] });
  };
}

export function useSaveScheduleGuest() {
  const invalidate = useInvalidateSchedules();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ scheduleId, guestId, ...guest }: ScheduleGuestInput & { scheduleId: string; guestId?: string }) =>
      guestId
        ? apiRequest<ScheduleGuest>(`/api/schedule-guests/${guestId}`, { method: 'PATCH', body: guest })
        : apiRequest<ScheduleGuest>(`/api/schedules/${scheduleId}/guests`, { method: 'POST', body: guest }),
    onSuccess: (_, variables) => {
      invalidate();
      toast({ title: variables.guestId ? 'Participação atualizada!' : 'Participação adicionada!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao salvar participação', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteScheduleGuest() {
  const invalidate = useInvalidateSchedules();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (guestId: string) =>
      apiRequest<{ message: string }>(`/api/schedule-guests/${guestId}`, { method: 'DELETE' }),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Participação removida' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao remover participação', description: error.message, variant: 'destructive' });
    },
  });
}
