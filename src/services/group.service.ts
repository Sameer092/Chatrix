import { supabase } from './supabase';
import type { Group, GroupMember, GroupMessage } from '../types';
import { Config } from '../constants/config';

export const groupService = {
  async getUserGroups(userId: string): Promise<Group[]> {
    const { data, error } = await supabase
      .from('groups')
      .select(`
        *,
        group_members!inner(user_id, role),
        member_count:group_members(count)
      `)
      .eq('group_members.user_id', userId)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((g: any) => ({
      ...g,
      member_count: g.member_count?.[0]?.count ?? 0,
      my_role: g.group_members?.[0]?.role,
    }));
  },

  async getGroup(groupId: string, userId: string): Promise<Group> {
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single();
    if (error) throw error;

    const { count } = await supabase
      .from('group_members')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', groupId);

    const { data: myMembership } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .maybeSingle();

    return {
      ...data,
      member_count: count ?? 0,
      my_role: myMembership?.role,
    };
  },

  async createGroup(params: {
    name: string;
    description?: string;
    avatarUrl?: string;
    memberIds: string[];
    createdBy: string;
  }): Promise<Group> {
    const { data: group, error } = await supabase
      .from('groups')
      .insert({
        name: params.name,
        description: params.description ?? null,
        avatar_url: params.avatarUrl ?? null,
        created_by: params.createdBy,
      })
      .select()
      .single();
    if (error) throw error;

    const members = [params.createdBy, ...params.memberIds].map((uid) => ({
      group_id: group.id,
      user_id: uid,
      role: uid === params.createdBy ? 'admin' : 'member',
    }));
    await supabase.from('group_members').insert(members);
    return group;
  },

  async getGroupMembers(groupId: string): Promise<GroupMember[]> {
    const { data, error } = await supabase
      .from('group_members')
      .select(`*, profile:profiles(id, username, name, avatar_url, is_online)`)
      .eq('group_id', groupId);
    if (error) throw error;
    return data ?? [];
  },

  async addMember(groupId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('group_members')
      .insert({ group_id: groupId, user_id: userId, role: 'member' });
    if (error) throw error;
  },

  async removeMember(groupId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId);
    if (error) throw error;
  },

  async leaveGroup(groupId: string, userId: string): Promise<void> {
    await this.removeMember(groupId, userId);
  },

  async updateGroup(groupId: string, updates: Partial<Group>): Promise<Group> {
    const { data, error } = await supabase
      .from('groups')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', groupId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getGroupMessages(groupId: string, page = 0): Promise<GroupMessage[]> {
    const limit = Config.pagination.messagesLimit;
    const { data, error } = await supabase
      .from('group_messages')
      .select(`*, sender:profiles!group_messages_sender_id_fkey(id, username, name, avatar_url)`)
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);
    if (error) throw error;
    return (data ?? []).reverse();
  },

  async sendGroupMessage(params: {
    groupId: string;
    senderId: string;
    content?: string;
    messageType?: GroupMessage['message_type'];
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    duration?: number;
  }): Promise<GroupMessage> {
    const { data, error } = await supabase
      .from('group_messages')
      .insert({
        group_id: params.groupId,
        sender_id: params.senderId,
        content: params.content ?? null,
        message_type: params.messageType ?? 'text',
        file_url: params.fileUrl ?? null,
        file_name: params.fileName ?? null,
        file_size: params.fileSize ?? null,
        duration: params.duration ?? null,
      })
      .select(`*, sender:profiles!group_messages_sender_id_fkey(id, username, name, avatar_url)`)
      .single();
    if (error) throw error;
    return data;
  },

  subscribeToGroupMessages(groupId: string, callback: (message: GroupMessage) => void) {
    return supabase
      .channel(`group_messages:${groupId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `group_id=eq.${groupId}` },
        async (payload) => {
          const { data } = await supabase
            .from('group_messages')
            .select(`*, sender:profiles!group_messages_sender_id_fkey(id, username, name, avatar_url)`)
            .eq('id', payload.new.id)
            .single();
          if (data) callback(data);
        }
      )
      .subscribe();
  },
};
