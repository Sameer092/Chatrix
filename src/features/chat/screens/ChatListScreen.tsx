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
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { chatService } from '../../../services/chat.service';
import { useAuthStore } from '../../../store/authStore';
import { useThemeStore } from '../../../store/themeStore';
import { ConversationItem } from '../components/ConversationItem';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Skeleton } from '../../../components/ui/Skeleton';
import type { RootNavProp } from '../../../types/navigation.types';
import type { Conversation } from '../../../types';

export default function ChatListScreen() {
  const insets = useSafeAreaInsets();
  const isDark = useThemeStore((s) => s.isDark);
  const userId = useAuthStore((s) => s.user?.id);
  const navigation = useNavigation<RootNavProp>();

  const { data: conversations, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['conversations', userId],
    queryFn: () => chatService.getConversations(userId!),
    enabled: !!userId,
    refetchInterval: 30000,
  });

  const handleConversationPress = (conv: Conversation) => {
    if (!conv.other_member) return;
    navigation.navigate('Chat', {
      conversationId: conv.id,
      userId: conv.other_member.id,
      username: conv.other_member.username,
      avatar: conv.other_member.avatar_url ?? undefined,
    });
  };

  const bgColor = isDark ? '#0F0F23' : '#F8F9FA';
  const textColor = isDark ? '#FFFFFF' : '#1E293B';

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={[styles.title, { color: textColor }]}>Messages</Text>
        <TouchableOpacity style={styles.searchBtn} onPress={() => navigation.navigate('Search')}>
          <Ionicons name="search-outline" size={24} color={textColor} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          {[...Array(6)].map((_, i) => (
            <View key={i} style={styles.skeletonItem}>
              <Skeleton width={52} height={52} borderRadius={26} />
              <View style={styles.skeletonText}>
                <Skeleton width={140} height={14} borderRadius={7} />
                <Skeleton width={200} height={11} borderRadius={5} style={{ marginTop: 8 }} />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={conversations ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ConversationItem
              conversation={item}
              onPress={() => handleConversationPress(item)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="chatbubbles-outline"
              title="No conversations yet"
              message="Start a conversation by finding a friend in Search"
              actionLabel="Find Friends"
              onAction={() => navigation.navigate('Search')}
            />
          }
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#6C63FF" />
          }
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 80 },
          ]}
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
  searchBtn: { padding: 4 },
  loadingContainer: { paddingHorizontal: 20, paddingTop: 8 },
  skeletonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  skeletonText: { marginLeft: 14, flex: 1 },
  listContent: { flexGrow: 1 },
});
