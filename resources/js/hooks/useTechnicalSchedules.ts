import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export interface TechnicalTechnician {
  id: string;
  name: string;
  avatar_url: string | null;
  home_group: 'GHH' | 'GHS' | 'GHJ' | 'GHC' | null;
  can_be_tech_lead: boolean;
  can_be_tech_sound: boolean;
  can_be_tech_streaming: boolean;
}

export interface TechnicalScheduleWeek {
  id: string | null;
  week_start_date: string;
  schedule_type?: 'public_worship' | 'ghj';
  lead_profile_id: string | null;
  sound_profile_id: string | null;
  streaming_profile_id: string | null;
  lead_profile: TechnicalTechnician | null;
  sound_profile: TechnicalTechnician | null;
  streaming_profile: TechnicalTechnician | null;
}

interface TechnicalSchedulesResponse {
  weeks: TechnicalScheduleWeek[];
  technicians: TechnicalTechnician[];
  fairness_score: number;
}

interface GenerateTechnicalSchedulesResponse {
  simulated: boolean;
  schedule_type?: 'public_worship' | 'ghj';
  weeks: TechnicalScheduleWeek[];
  fairness_score: number;
  lead_coverage_deficit_score?: number;
  lead_sequence_deviation_score?: number;
  role_repetition_score: number;
  load_by_technician: Record<string, number>;
}

export function useTechnicalSchedules(startDate: string, weeks: number) {
  return useQuery({
    queryKey: ['technical-schedules', startDate, weeks],
    queryFn: async () => {
      const params = new URLSearchParams({
        start_date: startDate,
        weeks: String(weeks),
      });

      return apiRequest<TechnicalSchedulesResponse>(`/api/technical-schedules?${params.toString()}`);
    },
  });
}

export function useGenerateTechnicalSchedules() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: {
      start_date: string;
      weeks: number;
      simulate: boolean;
      schedule_type?: 'public_worship' | 'ghj';
    }) => {
      return apiRequest<GenerateTechnicalSchedulesResponse>('/api/technical-schedules/generate', {
        method: 'POST',
        body: payload,
      });
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['technical-schedules'] });
      toast({
        title: response.simulated ? 'Simulação concluída' : 'Escala técnica gerada',
        description: `Índice de justiça: ${response.fairness_score}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao gerar escala técnica',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateTechnicalScheduleWeek() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: {
        lead_profile_id?: string | null;
        sound_profile_id?: string | null;
        streaming_profile_id?: string | null;
      };
    }) => {
      return apiRequest<TechnicalScheduleWeek>(`/api/technical-schedules/${id}`, {
        method: 'PATCH',
        body: payload,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technical-schedules'] });
      toast({ title: 'Semana técnica atualizada' });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar semana',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteTechnicalScheduleWeek() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      return apiRequest<{ message: string }>(`/api/technical-schedules/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technical-schedules'] });
      toast({ title: 'Semana técnica removida' });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao remover semana',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
