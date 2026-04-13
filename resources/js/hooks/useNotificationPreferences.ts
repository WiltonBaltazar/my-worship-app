import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';

export interface NotificationPreferences {
  push_enabled: boolean;
  announcement: boolean;
  change_request: boolean;
  approval_request: boolean;
  confirmation: boolean;
  substitute_request: boolean;
  schedule: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  push_enabled: true,
  announcement: true,
  change_request: true,
  approval_request: true,
  confirmation: true,
  substitute_request: true,
  schedule: true,
};

export function useNotificationPreferences() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: () =>
      apiRequest<{ preferences: NotificationPreferences }>('/api/auth/notification-preferences'),
  });

  const mutation = useMutation({
    mutationFn: (updates: Partial<NotificationPreferences>) =>
      apiRequest<{ preferences: NotificationPreferences }>('/api/auth/notification-preferences', {
        method: 'PATCH',
        body: updates,
      }),
    onSuccess: (response) => {
      queryClient.setQueryData(['notification-preferences'], response);
    },
  });

  const preferences: NotificationPreferences = data?.preferences ?? DEFAULT_PREFERENCES;

  return {
    preferences,
    isLoading,
    update: mutation.mutateAsync,
    isPending: mutation.isPending,
  };
}
