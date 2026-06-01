import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { friendService } from '../../../services/friend.service';
import { notificationService } from '../../../services/notification.service';

export function useFriends(userId: string | undefined) {
  const queryClient = useQueryClient();

  const friendsQuery = useQuery({
    queryKey: ['friends', userId],
    queryFn: () => friendService.getFriends(userId!),
    enabled: !!userId,
  });

  const requestsQuery = useQuery({
    queryKey: ['friendRequests', userId],
    queryFn: () => friendService.getFriendRequests(userId!),
    enabled: !!userId,
  });

  const sendRequest = useMutation({
    mutationFn: async ({ senderId, receiverId }: { senderId: string; receiverId: string }) => {
      const req = await friendService.sendFriendRequest(senderId, receiverId);
      await notificationService.createNotification({
        userId: receiverId,
        actorId: senderId,
        type: 'friend_request',
        entityId: req.id,
        entityType: 'friend_request',
      });
      return req;
    },
  });

  const acceptRequest = useMutation({
    mutationFn: async ({
      requestId,
      senderId,
      currentUserId,
    }: {
      requestId: string;
      senderId: string;
      currentUserId: string;
    }) => {
      await friendService.acceptFriendRequest(requestId);
      await notificationService.createNotification({
        userId: senderId,
        actorId: currentUserId,
        type: 'friend_accepted',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends', userId] });
      queryClient.invalidateQueries({ queryKey: ['friendRequests', userId] });
    },
  });

  const rejectRequest = useMutation({
    mutationFn: (requestId: string) => friendService.rejectFriendRequest(requestId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['friendRequests', userId] }),
  });

  const unfriend = useMutation({
    mutationFn: ({ friendId }: { friendId: string }) =>
      friendService.unfriend(userId!, friendId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['friends', userId] }),
  });

  return { friendsQuery, requestsQuery, sendRequest, acceptRequest, rejectRequest, unfriend };
}
