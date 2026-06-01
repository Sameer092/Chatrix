import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import type { Notification } from '../types';
import { Config } from '../constants/config';

export const notificationService = {
  async registerForPushNotifications(): Promise<string | null> {
    if (!Device.isDevice) return null;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6C63FF',
      });
    }

    const token = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    });

    return token.data;
  },

  async getNotifications(userId: string, page = 0): Promise<Notification[]> {
    const limit = Config.pagination.notificationsLimit;
    const { data, error } = await supabase
      .from('notifications')
      .select(`
        *,
        actor:profiles!notifications_actor_id_fkey(id, username, name, avatar_url)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);
    if (error) throw error;
    return data ?? [];
  },

  async getUnreadCount(userId: string): Promise<number> {
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    return count ?? 0;
  },

  async markAsRead(notificationId: string): Promise<void> {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
  },

  async markAllAsRead(userId: string): Promise<void> {
    await supabase.rpc('mark_all_notifications_read');
  },

  async createNotification(params: {
    userId: string;
    actorId: string;
    type: Notification['type'];
    entityId?: string;
    entityType?: string;
  }): Promise<void> {
    if (params.userId === params.actorId) return;
    await supabase.from('notifications').insert({
      user_id: params.userId,
      actor_id: params.actorId,
      type: params.type,
      entity_id: params.entityId ?? null,
      entity_type: params.entityType ?? null,
    });
  },

  subscribeToNotifications(userId: string, callback: (notification: Notification) => void) {
    return supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        async (payload) => {
          const { data } = await supabase
            .from('notifications')
            .select(`*, actor:profiles!notifications_actor_id_fkey(id, username, name, avatar_url)`)
            .eq('id', payload.new.id)
            .single();
          if (data) callback(data);
        }
      )
      .subscribe();
  },
};
