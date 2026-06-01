import { supabase } from './supabase';
import type { Conversation, Message } from '../types';
import { Config } from '../constants/config';

export const chatService = {
  async getConversations(userId: string): Promise<Conversation[]> {
    // RLS (is_conversation_member) already restricts this to the user's
    // conversations, so no explicit membership filter is needed.
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        members:conversation_members(
          user_id,
          last_read_at,
          profile:profiles(id, username, name, avatar_url, is_online, last_seen)
        )
      `)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    if (!data) return [];

    return Promise.all(
      data.map(async (conv: any) => {
        const otherMember = conv.members?.find((m: any) => m.user_id !== userId)?.profile;
        const myMembership = conv.members?.find((m: any) => m.user_id === userId);
        const lastReadAt: string | undefined = myMembership?.last_read_at;

        // Latest message preview
        const { data: lastMsgRows } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1);
        const lastMessage = lastMsgRows?.[0];

        // Unread count = messages from others newer than my last_read_at
        let unreadCount = 0;
        if (lastReadAt) {
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .neq('sender_id', userId)
            .gt('created_at', lastReadAt);
          unreadCount = count ?? 0;
        }

        return {
          ...conv,
          other_member: otherMember,
          last_message: lastMessage,
          unread_count: unreadCount,
        };
      })
    );
  },

  async getOrCreateConversation(otherUserId: string): Promise<string> {
    const { data, error } = await supabase.rpc('get_or_create_conversation', {
      other_user_id: otherUserId,
    });
    if (error) throw error;
    return data;
  },

  async getMessages(conversationId: string, page = 0): Promise<Message[]> {
    const limit = Config.pagination.messagesLimit;
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(id, username, name, avatar_url)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);
    if (error) throw error;
    return (data ?? []).reverse();
  },

  async sendMessage(params: {
    conversationId: string;
    senderId: string;
    content?: string;
    messageType?: Message['message_type'];
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    duration?: number;
  }): Promise<Message> {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: params.conversationId,
        sender_id: params.senderId,
        content: params.content ?? null,
        message_type: params.messageType ?? 'text',
        file_url: params.fileUrl ?? null,
        file_name: params.fileName ?? null,
        file_size: params.fileSize ?? null,
        duration: params.duration ?? null,
      })
      .select(`*, sender:profiles!messages_sender_id_fkey(id, username, name, avatar_url)`)
      .single();
    if (error) throw error;
    return data;
  },

  async markMessagesRead(conversationId: string, userId: string): Promise<void> {
    const { data: messages } = await supabase
      .from('messages')
      .select('id')
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId);

    if (!messages?.length) return;

    const reads = messages.map((m) => ({ message_id: m.id, user_id: userId }));
    await supabase.from('message_reads').upsert(reads, { onConflict: 'message_id,user_id' });

    await supabase
      .from('conversation_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);
  },

  async deleteMessage(messageId: string): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .update({ is_deleted: true, content: null })
      .eq('id', messageId);
    if (error) throw error;
  },

  subscribeToMessages(
    conversationId: string,
    callback: (message: Message) => void
  ) {
    return supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const { data } = await supabase
            .from('messages')
            .select(`*, sender:profiles!messages_sender_id_fkey(id, username, name, avatar_url)`)
            .eq('id', payload.new.id)
            .single();
          if (data) callback(data);
        }
      )
      .subscribe();
  },

  subscribeToTyping(
    conversationId: string,
    userId: string,
    callbacks: { onTypingStart: (userId: string) => void; onTypingStop: (userId: string) => void }
  ) {
    return supabase
      .channel(`typing:${conversationId}`)
      .on('broadcast', { event: 'typing_start' }, (payload) => {
        if (payload.payload.user_id !== userId) {
          callbacks.onTypingStart(payload.payload.user_id);
        }
      })
      .on('broadcast', { event: 'typing_stop' }, (payload) => {
        if (payload.payload.user_id !== userId) {
          callbacks.onTypingStop(payload.payload.user_id);
        }
      })
      .subscribe();
  },

  async broadcastTyping(conversationId: string, userId: string, isTyping: boolean) {
    await supabase.channel(`typing:${conversationId}`).send({
      type: 'broadcast',
      event: isTyping ? 'typing_start' : 'typing_stop',
      payload: { user_id: userId },
    });
  },
};
