import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import type { Ministry } from '@/lib/ministry';

export interface OpenAvailabilityCall {
  schedule_id: string;
  schedule_date: string;
  start_time: string | null;
  title: string | null;
  ministry: Ministry;
  deadline: string | null;
  my_response: boolean | null;
  is_scheduled: boolean;
}

export interface AvailabilityCallStatus {
  schedule_id: string;
  is_open: boolean;
  opened_at: string | null;
  closed_at: string | null;
  deadline: string | null;
}

export interface AvailabilityResponse {
  id: string;
  available: boolean;
  responded_at: string | null;
  is_scheduled: boolean;
  profile: {
    id: string;
    name: string;
    avatar_url: string | null;
    instruments: string[];
    voices: string[];
  } | null;
}

export function useOpenAvailabilityCalls(enabled = true) {
  return useQuery({
    queryKey: ['availability-calls'],
    enabled,
    queryFn: async () => apiRequest<OpenAvailabilityCall[]>('/api/availability-calls'),
  });
}

export function useAvailabilityResponses(scheduleId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['availability-responses', scheduleId],
    enabled: enabled && !!scheduleId,
    queryFn: async () =>
      apiRequest<AvailabilityCallStatus & { responses: AvailabilityResponse[] }>(
        `/api/schedules/${scheduleId}/availability-call`,
      ),
  });
}

export function useRespondAvailability() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ scheduleId, available }: { scheduleId: string; available: boolean }) =>
      apiRequest<{ available: boolean }>(`/api/schedules/${scheduleId}/availability`, {
        method: 'PUT',
        body: { available },
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['availability-calls'] });
      toast({
        title: variables.available ? 'Disponibilidade enviada!' : 'Resposta registrada',
        description: variables.available ? 'A liderança vai definir sua função na escala.' : undefined,
      });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao responder', description: error.message, variant: 'destructive' });
    },
  });
}

export function useOpenAvailabilityCall() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ scheduleId, deadline }: { scheduleId: string; deadline?: string | null }) =>
      apiRequest<AvailabilityCallStatus>(`/api/schedules/${scheduleId}/availability-call`, {
        method: 'POST',
        body: { deadline: deadline || null },
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['availability-responses', variables.scheduleId] });
      toast({ title: 'Convocatória aberta!', description: 'Os membros do ministério foram notificados.' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao abrir convocatória', description: error.message, variant: 'destructive' });
    },
  });
}

export function useCloseAvailabilityCall() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (scheduleId: string) =>
      apiRequest<AvailabilityCallStatus>(`/api/schedules/${scheduleId}/availability-call`, {
        method: 'DELETE',
      }),
    onSuccess: (_, scheduleId) => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['availability-responses', scheduleId] });
      toast({ title: 'Convocatória encerrada' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao encerrar convocatória', description: error.message, variant: 'destructive' });
    },
  });
}
