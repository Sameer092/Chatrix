import { supabase } from './supabase';
import type { Profile } from '../types';

export const profileService = {
  async getProfile(userId: string): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) throw error;
    return data;
  },

  async updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    await supabase
      .from('profiles')
      .update({ is_online: isOnline, last_seen: new Date().toISOString() })
      .eq('id', userId);
  },

  async updatePushToken(userId: string, token: string | null): Promise<void> {
    await supabase.from('profiles').update({ push_token: token }).eq('id', userId);
  },

  async searchUsers(query: string, limit = 20): Promise<Profile[]> {
    const { data, error } = await supabase
      .rpc('search_users', { query, page_limit: limit, page_offset: 0 });
    if (error) throw error;
    return data ?? [];
  },

  async getMultipleProfiles(userIds: string[]): Promise<Profile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .in('id', userIds);
    if (error) throw error;
    return data ?? [];
  },
};
