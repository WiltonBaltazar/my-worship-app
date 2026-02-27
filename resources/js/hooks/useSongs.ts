import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export interface Song {
  id: string;
  title: string;
  artist: string | null;
  chords_url: string | null;
  lyrics_url: string | null;
  lyrics: string | null;
  video_url: string | null;
  spotify_url: string | null;
  apple_music_url: string | null;
  tags: string[];
  created_at: string;
}

export function useSongs() {
  return useQuery({
    queryKey: ['songs'],
    queryFn: async () => {
      return apiRequest<Song[]>('/api/songs');
    }
  });
}

export function useCreateSong() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (song: Omit<Song, 'id' | 'created_at'>) => {
      return apiRequest<Song>('/api/songs', {
        method: 'POST',
        body: song,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs'] });
      toast({ title: 'Música adicionada!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao adicionar música', description: error.message, variant: 'destructive' });
    }
  });
}

export function useUpdateSong() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Song> & { id: string }) => {
      return apiRequest<Song>(`/api/songs/${id}`, {
        method: 'PATCH',
        body: updates,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs'] });
      toast({ title: 'Música atualizada!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao atualizar música', description: error.message, variant: 'destructive' });
    }
  });
}

export function useDeleteSong() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      return apiRequest<{ message: string }>(`/api/songs/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs'] });
      toast({ title: 'Música removida!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao remover música', description: error.message, variant: 'destructive' });
    }
  });
}
