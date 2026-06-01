import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatService } from '../../../services/chat.service';
import type { Message } from '../../../types';

export function useChat(conversationId: string, userId: string) {
  const queryClient = useQueryClient();

  const messagesQuery = useInfiniteQuery({
    queryKey: ['messages', conversationId],
    queryFn: ({ pageParam = 0 }) => chatService.getMessages(conversationId, pageParam as number),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === 30 ? allPages.length : undefined,
  });

  const sendMessage = useMutation({
    mutationFn: (params: {
      content?: string;
      messageType?: Message['message_type'];
      fileUrl?: string;
      fileName?: string;
      fileSize?: number;
      duration?: number;
    }) =>
      chatService.sendMessage({
        conversationId,
        senderId: userId,
        ...params,
      }),
  });

  const deleteMessage = useMutation({
    mutationFn: (messageId: string) => chatService.deleteMessage(messageId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] }),
  });

  return {
    messagesQuery,
    messages: messagesQuery.data?.pages.flat() ?? [],
    sendMessage,
    deleteMessage,
  };
}
