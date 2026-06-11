import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { notificationService } from '../../../services/notification.service';
import { useAuthStore } from '../../../store/authStore';
import { useThemeStore } from '../../../store/themeStore';
import { useNotificationStore } from '../../../store/notificationStore';
import { Avatar } from '../../../components/ui/Avatar';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Skeleton } from '../../../components/ui/Skeleton';
import { formatDistanceToNow } from '../../../utils/formatters';
import type { Notification } from '../../../types';
import type { RootNavProp } from '../../../types/navigation.types';

const NOTIFICATION_ICONS: Record<string, string> = {
  like: 'heart',
  comment: 'chatbubble',
  friend_request: 'person-add',
  friend_accepted: 'people',
  message: 'chatbubbles',
  group_invite: 'people-circle',
  group_message: 'chatbubbles',
};

const NOTIFICATION_COLORS: Record<string, string> = {
  like: '#EF4444',
  comment: '#6C63FF',
  friend_request: '#22C55E',
  friend_accepted: '#22C55E',
  message: '#00D4FF',
  group_invite: '#F59E0B',
  group_message: '#6C63FF',
};

const NOTIFICATION_MESSAGES: Record<string, string> = {
  like: 'liked your post',
  comment: 'commented on your post',
  friend_request: 'sent you a friend request',
  friend_accepted: 'accepted your friend request',
  message: 'sent you a message',
  group_invite: 'added you to a group',
  group_message: 'sent a message in a group',
};

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const isDark = useThemeStore((s) => s.isDark);
  const userId = useAuthStore((s) => s.user?.id);
  const navigation = useNavigation<RootNavProp>();
  const queryClient = useQueryClient();
  const { markAllRead, markRead } = useNotificationStore();

  const { data: notifications, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['notifications', userId],
    queryFn: () => notificationService.getNotifications(userId!),
    enabled: !!userId,
  });

  const markOneRead = (id: string) => {
    // Optimistically flip the cached list so the unread dot clears instantly
    // (the FlatList renders from this query cache, not the store).
    queryClient.setQueryData<Notification[]>(['notifications', userId], (old) =>
      (old ?? []).map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    markRead(id); // decrements the tab badge count
    notificationService.markAsRead(id); // persist to server
  };

  const { mutate: markAllAsRead } = useMutation({
    mutationFn: () => notificationService.markAllAsRead(userId!),
    onMutate: () => {
      queryClient.setQueryData<Notification[]>(['notifications', userId], (old) =>
        (old ?? []).map((n) => ({ ...n, is_read: true }))
      );
      markAllRead();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
    },
  });

  const bgColor = isDark ? '#0F0F23' : '#F8F9FA';
  const textColor = isDark ? '#FFFFFF' : '#1E293B';
  const subtextColor = isDark ? '#94A3B8' : '#64748B';
  const cardBg = isDark ? '#1A1A3E' : '#FFFFFF';
  const borderColor = isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0';

  const renderNotification = ({ item }: { item: Notification }) => {
    const icon = NOTIFICATION_ICONS[item.type] ?? 'notifications';
    const color = NOTIFICATION_COLORS[item.type] ?? '#6C63FF';
    const message = NOTIFICATION_MESSAGES[item.type] ?? '';

    return (
      <TouchableOpacity
        style={[
          styles.notifRow,
          { borderBottomColor: borderColor },
          !item.is_read && { backgroundColor: isDark ? 'rgba(108,99,255,0.08)' : 'rgba(108,99,255,0.04)' },
        ]}
        activeOpacity={0.7}
        onPress={() => {
          if (!item.is_read) markOneRead(item.id);
          if ((item.type === 'like' || item.type === 'comment') && item.entity_id) {
            navigation.navigate('PostDetail', { postId: item.entity_id });
          } else if (item.type === 'friend_request' || item.type === 'friend_accepted') {
            navigation.navigate('Friends');
          } else if (item.actor?.id) {
            navigation.navigate('UserProfile', { userId: item.actor.id });
          }
        }}
      >
        <View style={styles.actorSection}>
          <Avatar
            uri={item.actor?.avatar_url}
            name={item.actor?.name ?? ''}
            size={46}
            onPress={() => item.actor?.id && navigation.navigate('UserProfile', { userId: item.actor.id })}
          />
          <View style={[styles.iconBadge, { backgroundColor: color }]}>
            <Ionicons name={icon as any} size={10} color="#FFFFFF" />
          </View>
        </View>

        <View style={styles.notifInfo}>
          <Text style={[styles.notifText, { color: textColor }]}>
            <Text style={styles.actorName}>{item.actor?.name ?? 'Someone'}</Text>
            {' '}{message}
          </Text>
          <Text style={[styles.notifTime, { color: subtextColor }]}>
            {formatDistanceToNow(item.created_at)}
          </Text>
        </View>

        {!item.is_read && (
          <View style={styles.unreadDot} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={[styles.title, { color: textColor }]}>Notifications</Text>
        {(notifications ?? []).some((n) => !n.is_read) && (
          <TouchableOpacity onPress={() => markAllAsRead()}>
            <Text style={styles.markAllRead}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={{ padding: 20, gap: 16 }}>
          {[...Array(5)].map((_, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Skeleton width={46} height={46} borderRadius={23} />
              <View style={{ flex: 1, gap: 8 }}>
                <Skeleton width="90%" height={13} borderRadius={6} />
                <Skeleton width="40%" height={11} borderRadius={5} />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={notifications ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderNotification}
          ListEmptyComponent={
            <EmptyState
              icon="notifications-outline"
              title="No notifications yet"
              message="When someone likes your post or sends you a message, you'll see it here"
            />
          }
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#6C63FF" />
          }
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 80 }]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  markAllRead: { color: '#6C63FF', fontSize: 14, fontWeight: '600' },
  listContent: { flexGrow: 1 },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    gap: 14,
  },
  actorSection: { position: 'relative' },
  iconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#0F0F23',
  },
  notifInfo: { flex: 1 },
  notifText: { fontSize: 14, lineHeight: 20 },
  actorName: { fontWeight: '700' },
  notifTime: { fontSize: 12, marginTop: 3 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6C63FF',
  },
});
