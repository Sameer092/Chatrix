import React, { useState } from 'react';
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
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';

import { groupService } from '../../../services/group.service';
import { useAuthStore } from '../../../store/authStore';
import { useThemeStore } from '../../../store/themeStore';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Skeleton } from '../../../components/ui/Skeleton';
import { Avatar } from '../../../components/ui/Avatar';
import { formatDistanceToNow } from '../../../utils/formatters';
import type { RootNavProp } from '../../../types/navigation.types';
import type { Group } from '../../../types';

export default function GroupsScreen() {
  const insets = useSafeAreaInsets();
  const isDark = useThemeStore((s) => s.isDark);
  const userId = useAuthStore((s) => s.user?.id);
  const navigation = useNavigation<RootNavProp>();

  const { data: groups, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['groups', userId],
    queryFn: () => groupService.getUserGroups(userId!),
    enabled: !!userId,
  });

  const bgColor = isDark ? '#0F0F23' : '#F8F9FA';
  const textColor = isDark ? '#FFFFFF' : '#1E293B';
  const cardBg = isDark ? '#1A1A3E' : '#FFFFFF';
  const subtextColor = isDark ? '#94A3B8' : '#64748B';

  const renderGroup = ({ item }: { item: Group }) => (
    <TouchableOpacity
      style={[styles.groupItem, { backgroundColor: cardBg, borderColor: isDark ? '#2D2D6B' : '#E2E8F0' }]}
      onPress={() =>
        navigation.navigate('GroupChat', {
          groupId: item.id,
          groupName: item.name,
          avatar: item.avatar_url ?? undefined,
        })
      }
      activeOpacity={0.7}
    >
      <Avatar uri={item.avatar_url} name={item.name} size={52} />
      <View style={styles.groupInfo}>
        <Text style={[styles.groupName, { color: textColor }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.memberCount, { color: subtextColor }]}>
          {item.member_count ?? 0} members
          {item.last_message ? ` · ${formatDistanceToNow(item.last_message.created_at)}` : ''}
        </Text>
        {item.last_message && (
          <Text style={[styles.lastMessage, { color: subtextColor }]} numberOfLines={1}>
            {item.last_message.content ?? '📎 Attachment'}
          </Text>
        )}
      </View>
      {item.my_role === 'admin' && (
        <View style={styles.adminBadge}>
          <Text style={styles.adminText}>Admin</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={[styles.title, { color: textColor }]}>Groups</Text>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => navigation.navigate('CreateGroup')}
        >
          <LinearGradient
            colors={['#6C63FF', '#FF6584']}
            style={styles.createGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.createText}>New Group</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          {[...Array(4)].map((_, i) => (
            <View key={i} style={[styles.skeletonItem, { borderColor: isDark ? '#2D2D6B' : '#E2E8F0' }]}>
              <Skeleton width={52} height={52} borderRadius={26} />
              <View style={styles.skeletonText}>
                <Skeleton width={140} height={14} borderRadius={7} />
                <Skeleton width={100} height={11} borderRadius={5} style={{ marginTop: 8 }} />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={groups ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderGroup}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 80 }]}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#6C63FF" />
          }
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title="No groups yet"
              message="Create a group and start chatting with multiple friends at once"
              actionLabel="Create Group"
              onAction={() => navigation.navigate('CreateGroup')}
            />
          }
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
  createBtn: { borderRadius: 20, overflow: 'hidden' },
  createGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  createText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  loadingContainer: { padding: 20 },
  skeletonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  skeletonText: { marginLeft: 14, flex: 1 },
  listContent: { padding: 16, gap: 12 },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
  },
  groupInfo: { flex: 1 },
  groupName: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  memberCount: { fontSize: 12, marginBottom: 2 },
  lastMessage: { fontSize: 13 },
  adminBadge: {
    backgroundColor: 'rgba(108,99,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6C63FF',
  },
  adminText: { color: '#6C63FF', fontSize: 11, fontWeight: '700' },
});
