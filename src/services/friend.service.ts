import { supabase } from './supabase';
import type { Friendship, FriendRequest } from '../types';

export const friendService = {
  async getFriends(userId: string): Promise<Friendship[]> {
    const { data, error } = await supabase
      .from('friendships')
      .select(`*, friend:profiles!friendships_friend_id_fkey(id, username, name, avatar_url, is_online, last_seen)`)
      .eq('user_id', userId);
    if (error) throw error;
    return data ?? [];
  },

  async getFriendCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('friendships')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    if (error) throw error;
    return count ?? 0;
  },

  async getFriendRequests(userId: string): Promise<FriendRequest[]> {
    const { data, error } = await supabase
      .from('friend_requests')
      .select(`
        *,
        sender:profiles!friend_requests_sender_id_fkey(id, username, name, avatar_url),
        receiver:profiles!friend_requests_receiver_id_fkey(id, username, name, avatar_url)
      `)
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .eq('status', 'pending');
    if (error) throw error;
    return data ?? [];
  },

  async sendFriendRequest(senderId: string, receiverId: string): Promise<FriendRequest> {
    const { data, error } = await supabase
      .from('friend_requests')
      .insert({ sender_id: senderId, receiver_id: receiverId, status: 'pending' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async acceptFriendRequest(requestId: string): Promise<void> {
    const { error } = await supabase
      .from('friend_requests')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', requestId);
    if (error) throw error;
  },

  async rejectFriendRequest(requestId: string): Promise<void> {
    const { error } = await supabase
      .from('friend_requests')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', requestId);
    if (error) throw error;
  },

  async unfriend(userId: string, friendId: string): Promise<void> {
    await supabase
      .from('friendships')
      .delete()
      .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`);
  },

  async checkFriendship(userId: string, otherUserId: string): Promise<{
    isFriend: boolean;
    requestSent: boolean;
    requestReceived: boolean;
    requestId?: string;
  }> {
    const [{ data: friendship }, { data: requests }] = await Promise.all([
      supabase
        .from('friendships')
        .select('id')
        .eq('user_id', userId)
        .eq('friend_id', otherUserId)
        .maybeSingle(),
      supabase
        .from('friend_requests')
        .select('id, sender_id, status')
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
        .eq('status', 'pending'),
    ]);

    const pendingRequest = requests?.[0];
    return {
      isFriend: !!friendship,
      requestSent: pendingRequest?.sender_id === userId,
      requestReceived: pendingRequest?.sender_id === otherUserId,
      requestId: pendingRequest?.id,
    };
  },
};
