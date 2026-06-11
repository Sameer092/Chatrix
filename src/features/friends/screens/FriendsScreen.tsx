import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { friendService } from '../../../services/friend.service';
import { notificationService } from '../../../services/notification.service';
import { useAuthStore } from '../../../store/authStore';
import { useThemeStore } from '../../../store/themeStore';
import { Avatar } from '../../../components/ui/Avatar';
import { EmptyState } from '../../../components/ui/EmptyState';
import { isUserOnline } from '../../../utils/formatters';
import type { FriendRequest, Friendship } from '../../../types';
import type { RootNavProp } from '../../../types/navigation.types';

export default function FriendsScreen() {
  const insets = useSafeAreaInsets();
  const isDark = useThemeStore((s) => s.isDark);
  const userId = useAuthStore((s) => s.user?.id);
  const navigation = useNavigation<RootNavProp>();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');

  const { data: friends, isLoading: loadingFriends, refetch: refetchFriends } = useQuery({
    queryKey: ['friends', userId],
    queryFn: () => friendService.getFriends(userId!),
    enabled: !!userId,
  });

  const { data: requests, isLoading: loadingRequests, refetch: refetchRequests } = useQuery({
    queryKey: ['friendRequests', userId],
    queryFn: () => friendService.getFriendRequests(userId!),
    enabled: !!userId,
  });

  const pendingReceived = (requests ?? []).filter((r) => r.receiver_id === userId && r.status === 'pending');

  const { mutate: acceptRequest } = useMutation({
    mutationFn: async (req: FriendRequest) => {
      await friendService.acceptFriendRequest(req.id);
      await notificationService.createNotification({
        userId: req.sender_id,
        actorId: userId!,
        type: 'friend_accepted',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends', userId] });
      queryClient.invalidateQueries({ queryKey: ['friendRequests', userId] });
    },
  });

  const { mutate: rejectRequest } = useMutation({
    mutationFn: (requestId: string) => friendService.rejectFriendRequest(requestId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['friendRequests', userId] }),
  });

  const { mutate: unfriend } = useMutation({
    mutationFn: (friendId: string) => friendService.unfriend(userId!, friendId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['friends', userId] }),
  });

  const bgColor = isDark ? '#0F0F23' : '#F8F9FA';
  const textColor = isDark ? '#FFFFFF' : '#1E293B';
  const subtextColor = isDark ? '#94A3B8' : '#64748B';
  const cardBg = isDark ? '#1A1A3E' : '#FFFFFF';
  const borderColor = isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0';

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: textColor }]}>Friends</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Search')}>
          <Ionicons name="person-add-outline" size={24} color="#6C63FF" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: cardBg }]}>
        {(['friends', 'requests'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText, { color: activeTab === tab ? '#6C63FF' : subtextColor }]}>
              {tab === 'friends' ? `Friends (${(friends ?? []).length})` : `Requests (${pendingReceived.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'friends' ? (
        <FlatList
          data={friends ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const friend = item.friend;
            return (
              <TouchableOpacity
                style={[styles.friendRow, { borderBottomColor: borderColor }]}
                onPress={() => friend?.id && navigation.navigate('UserProfile', { userId: friend.id })}
                activeOpacity={0.7}
              >
                <Avatar uri={friend?.avatar_url} name={friend?.name ?? ''} size={50} isOnline={isUserOnline(friend?.is_online, friend?.last_seen)} />
                <View style={styles.friendInfo}>
                  <Text style={[styles.friendName, { color: textColor }]}>{friend?.name}</Text>
                  <Text style={[styles.friendUsername, { color: subtextColor }]}>@{friend?.username}</Text>
                </View>
                <TouchableOpacity
                  onPress={() =>
                    Alert.alert('Unfriend', `Remove ${friend?.name} from friends?`, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Remove', style: 'destructive', onPress: () => friend?.id && unfriend(friend.id) },
                    ])
                  }
                >
                  <Ionicons name="person-remove-outline" size={20} color={subtextColor} />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title="No friends yet"
              message="Search for people you know and send them a friend request"
              actionLabel="Find Friends"
              onAction={() => navigation.navigate('Search')}
            />
          }
          refreshControl={
            <RefreshControl refreshing={loadingFriends} onRefresh={refetchFriends} tintColor="#6C63FF" />
          }
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
        />
      ) : (
        <FlatList
          data={pendingReceived}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={[styles.requestRow, { borderBottomColor: borderColor }]}>
              <Avatar uri={item.sender?.avatar_url} name={item.sender?.name ?? ''} size={50} />
              <View style={styles.requestInfo}>
                <Text style={[styles.friendName, { color: textColor }]}>{item.sender?.name}</Text>
                <Text style={[styles.friendUsername, { color: subtextColor }]}>@{item.sender?.username}</Text>
              </View>
              <View style={styles.requestActions}>
                <TouchableOpacity
                  style={styles.acceptBtn}
                  onPress={() => acceptRequest(item)}
                >
                  <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.rejectBtn, { borderColor: isDark ? '#2D2D6B' : '#E2E8F0' }]}
                  onPress={() => rejectRequest(item.id)}
                >
                  <Ionicons name="close" size={18} color={subtextColor} />
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="mail-open-outline"
              title="No pending requests"
              message="When someone sends you a friend request, it will appear here"
            />
          }
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
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
  title: { fontSize: 22, fontWeight: '800' },
  tabs: { flexDirection: 'row', marginHorizontal: 16, marginVertical: 12, borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  activeTab: { backgroundColor: 'rgba(108,99,255,0.15)' },
  tabText: { fontSize: 14, fontWeight: '500' },
  activeTabText: { fontWeight: '700' },
  listContent: { flexGrow: 1 },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    gap: 14,
  },
  friendInfo: { flex: 1 },
  friendName: { fontSize: 16, fontWeight: '700' },
  friendUsername: { fontSize: 13, marginTop: 2 },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    gap: 14,
  },
  requestInfo: { flex: 1 },
  requestActions: { flexDirection: 'row', gap: 10 },
  acceptBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
