import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { chatService } from '../../../services/chat.service';
import { profileService } from '../../../services/profile.service';
import { useAuthStore } from '../../../store/authStore';
import { useThemeStore } from '../../../store/themeStore';
import { useChatStore } from '../../../store/chatStore';
import { MessageBubble } from '../components/MessageBubble';
import { MessageInput } from '../components/MessageInput';
import { TypingIndicator } from '../components/TypingIndicator';
import { Avatar } from '../../../components/ui/Avatar';
import { formatPresence } from '../../../utils/formatters';
import type { Message } from '../../../types';
import type { RootRouteProp, RootNavProp } from '../../../types/navigation.types';

export default function ChatScreen() {
  const route = useRoute<RootRouteProp<'Chat'>>();
  const navigation = useNavigation<RootNavProp>();
  const insets = useSafeAreaInsets();
  const isDark = useThemeStore((s) => s.isDark);
  const currentUser = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const { conversationId, userId: otherUserId, username, avatar } = route.params;

  // Live presence of the other user (refetched every 20s + realtime-friendly).
  const { data: otherProfile } = useQuery({
    queryKey: ['profile', otherUserId],
    queryFn: () => profileService.getProfile(otherUserId),
    enabled: !!otherUserId,
    refetchInterval: 20000,
  });

  const presence = formatPresence(otherProfile?.is_online, otherProfile?.last_seen);
  const flatListRef = useRef<FlatList>(null);
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const typingUsers = useChatStore((s) => s.getTypingUsers(conversationId));
  const addTypingUser = useChatStore((s) => s.addTypingUser);
  const removeTypingUser = useChatStore((s) => s.removeTypingUser);

  const { data, fetchNextPage, hasNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['messages', conversationId],
    queryFn: ({ pageParam = 0 }) => chatService.getMessages(conversationId, pageParam as number),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === 30 ? allPages.length : undefined,
  });

  const messages = [...(data?.pages.flat() ?? []), ...localMessages];

  useEffect(() => {
    if (!currentUser?.id) return;
    chatService.markMessagesRead(conversationId, currentUser.id);

    const channel = chatService.subscribeToMessages(conversationId, (msg) => {
      setLocalMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      if (msg.sender_id !== currentUser.id) {
        chatService.markMessagesRead(conversationId, currentUser.id);
      }
    });

    const typingChannel = chatService.subscribeToTyping(
      conversationId,
      currentUser.id,
      {
        onTypingStart: (uid) => addTypingUser(uid, conversationId),
        onTypingStop: (uid) => removeTypingUser(uid, conversationId),
      }
    );

    return () => {
      channel.unsubscribe();
      typingChannel.unsubscribe();
    };
  }, [conversationId, currentUser?.id]);

  const { mutate: sendMessage } = useMutation({
    mutationFn: async (params: {
      content?: string;
      messageType?: Message['message_type'];
      fileUrl?: string;
      fileName?: string;
      fileSize?: number;
      duration?: number;
    }) => {
      if (!currentUser?.id) return;
      return chatService.sendMessage({
        conversationId,
        senderId: currentUser.id,
        ...params,
      });
    },
    onSuccess: (msg) => {
      if (msg) {
        setLocalMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    },
    onError: (error: Error) => {
      Alert.alert('Could not send', error.message ?? 'Please try again.');
    },
  });

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const renderMessage = useCallback(
    ({ item, index }: { item: Message; index: number }) => {
      const isMe = item.sender_id === currentUser?.id;
      const prevMsg = messages[index - 1];
      const showAvatar = !isMe && (!prevMsg || prevMsg.sender_id !== item.sender_id);
      return (
        <MessageBubble
          message={item}
          isMe={isMe}
          showAvatar={showAvatar}
        />
      );
    },
    [currentUser?.id, messages]
  );

  const bgColor = isDark ? '#0F0F23' : '#F8F9FA';
  const headerBg = isDark ? '#1A1A3E' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#1E293B';
  const subtextColor = isDark ? '#94A3B8' : '#64748B';

  const handleCall = () => {
    Alert.alert('Calls coming soon', 'Voice & video calling is not available in this build yet.');
  };

  const handleMenu = () => {
    Alert.alert(username, undefined, [
      {
        text: 'View Profile',
        onPress: () => navigation.navigate('UserProfile', { userId: otherUserId }),
      },
      {
        text: 'Clear chat',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Clear chat', 'Delete all messages in this conversation for you?', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Clear',
              style: 'destructive',
              onPress: async () => {
                setLocalMessages([]);
                await queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
              },
            },
          ]),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: bgColor }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: headerBg, paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color={textColor} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerProfile}
          onPress={() => navigation.navigate('UserProfile', { userId: otherUserId })}
          activeOpacity={0.7}
        >
          <Avatar uri={otherProfile?.avatar_url ?? avatar} name={username} size={36} isOnline={presence.online} />
          <View style={styles.headerInfo}>
            <Text style={[styles.headerName, { color: textColor }]}>{username}</Text>
            <Text style={[styles.headerStatus, { color: presence.online ? '#22C55E' : subtextColor }]}>
              {presence.text}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerBtn} onPress={handleCall}>
          <Ionicons name="call-outline" size={22} color={textColor} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerBtn} onPress={handleMenu}>
          <Ionicons name="ellipsis-vertical" size={22} color={textColor} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        onEndReached={() => hasNextPage && fetchNextPage()}
        onEndReachedThreshold={0.2}
        contentContainerStyle={[styles.messagesList, { paddingBottom: 16 }]}
        showsVerticalScrollIndicator={false}
        maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
      />

      {typingUsers.length > 0 && (
        <TypingIndicator />
      )}

      <MessageInput
        onSend={(content, type, fileData) =>
          sendMessage({
            content,
            messageType: type,
            fileUrl: fileData?.url,
            fileName: fileData?.name,
            fileSize: fileData?.size,
            duration: fileData?.duration,
          })
        }
        onTypingChange={(isTyping) => {
          if (!currentUser?.id) return;
          chatService.broadcastTyping(conversationId, currentUser.id, isTyping);
        }}
        conversationId={conversationId}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    gap: 10,
  },
  backBtn: { padding: 4 },
  headerProfile: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 16, fontWeight: '700' },
  headerStatus: { fontSize: 12, marginTop: 1 },
  headerBtn: { padding: 6 },
  messagesList: { paddingHorizontal: 16, paddingTop: 12 },
});
