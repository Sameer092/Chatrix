import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { groupService } from '../../../services/group.service';

export function useGroups(userId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['groups', userId],
    queryFn: () => groupService.getUserGroups(userId!),
    enabled: !!userId,
  });

  const leaveGroup = useMutation({
    mutationFn: ({ groupId, uid }: { groupId: string; uid: string }) =>
      groupService.leaveGroup(groupId, uid),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups', userId] }),
  });

  return { ...query, leaveGroup };
}
