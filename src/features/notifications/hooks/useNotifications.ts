import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '../../../services/notification.service';
import { useNotificationStore } from '../../../store/notificationStore';

export function useNotificationsList(userId: string | undefined) {
  const queryClient = useQueryClient();
  const { markAllRead } = useNotificationStore();

  const query = useQuery({
    queryKey: ['notifications', userId],
    queryFn: () => notificationService.getNotifications(userId!),
    enabled: !!userId,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => notificationService.markAsRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', userId] }),
  });

  const markAllAsRead = useMutation({
    mutationFn: () => notificationService.markAllAsRead(userId!),
    onSuccess: () => {
      markAllRead();
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
    },
  });

  return { ...query, markRead, markAllAsRead };
}
