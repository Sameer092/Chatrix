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
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { groupService } from '../../../services/group.service';
import { useAuthStore } from '../../../store/authStore';
import { useThemeStore } from '../../../store/themeStore';
import { MessageInput } from '../../chat/components/MessageInput';
import { MessageBubble } from '../../chat/components/MessageBubble';
import { Avatar } from '../../../components/ui/Avatar';
import type { GroupMessage, Message } from '../../../types';
import type { RootRouteProp, RootNavProp } from '../../../types/navigation.types';

export default function GroupChatScreen() {
  const route = useRoute<RootRouteProp<'GroupChat'>>();
  const navigation = useNavigation<RootNavProp>();
  const insets = useSafeAreaInsets();
  const isDark = useThemeStore((s) => s.isDark);
  const currentUser = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const { groupId, groupName, avatar } = route.params;
  const flatListRef = useRef<FlatList>(null);
  const [localMessages, setLocalMessages] = useState<GroupMessage[]>([]);

  const handleMenu = () => {
    Alert.alert(groupName, undefined, [
      {
        text: 'Group Info',
        onPress: () => navigation.navigate('GroupInfo', { groupId }),
      },
      {
        text: 'Leave Group',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Leave Group', `Leave "${groupName}"? You will stop receiving messages.`, [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Leave',
              style: 'destructive',
              onPress: async () => {
                if (!currentUser?.id) return;
                try {
                  await groupService.leaveGroup(groupId, currentUser.id);
                  await queryClient.invalidateQueries({ queryKey: ['groups', currentUser.id] });
                  navigation.goBack();
                } catch {
                  Alert.alert('Error', 'Could not leave the group.');
                }
              },
            },
          ]),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ['group-messages', groupId],
    queryFn: ({ pageParam = 0 }) => groupService.getGroupMessages(groupId, pageParam as number),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === 30 ? allPages.length : undefined,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const messages = [...(data?.pages.flat() ?? []), ...localMessages];

  useEffect(() => {
    const channel = groupService.subscribeToGroupMessages(groupId, (msg) => {
      setLocalMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });
    return () => { channel.unsubscribe(); };
  }, [groupId]);

  const { mutate: sendMessage } = useMutation({
    mutationFn: (params: { content?: string; messageType?: GroupMessage['message_type']; fileUrl?: string; fileName?: string; fileSize?: number; duration?: number }) => {
      if (!currentUser?.id) throw new Error('Not authenticated');
      return groupService.sendGroupMessage({
        groupId,
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

  const bgColor = isDark ? '#0F0F23' : '#F8F9FA';
  const textColor = isDark ? '#FFFFFF' : '#1E293B';
  const headerBg = isDark ? '#1A1A3E' : '#FFFFFF';

  const renderMessage = useCallback(
    ({ item, index }: { item: GroupMessage; index: number }) => {
      const isMe = item.sender_id === currentUser?.id;
      const prev = messages[index - 1];
      const showAvatar = !isMe && (!prev || prev.sender_id !== item.sender_id);
      return (
        <MessageBubble
          message={item as unknown as Message}
          isMe={isMe}
          showAvatar={showAvatar}
          showSenderName={!isMe}
        />
      );
    },
    [currentUser?.id, messages]
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: bgColor }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { backgroundColor: headerBg, paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color={textColor} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerProfile}
          onPress={() => navigation.navigate('GroupInfo', { groupId })}
          activeOpacity={0.7}
        >
          <Avatar uri={avatar} name={groupName} size={36} />
          <View style={styles.headerInfo}>
            <Text style={[styles.headerName, { color: textColor }]}>{groupName}</Text>
            <Text style={styles.headerSub}>Tap for group info</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerBtn} onPress={handleMenu}>
          <Ionicons name="ellipsis-vertical" size={22} color={textColor} />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        onEndReached={() => hasNextPage && fetchNextPage()}
        onEndReachedThreshold={0.2}
        contentContainerStyle={[styles.messagesList, { paddingBottom: 16 }]}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />

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
        onTypingChange={() => {}}
        conversationId={groupId}
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
  headerSub: { fontSize: 11, color: '#94A3B8', marginTop: 1 },
  headerBtn: { padding: 6 },
  messagesList: { paddingHorizontal: 16, paddingTop: 12 },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 3,
    gap: 8,
  },
  messageRowMe: { flexDirection: 'row-reverse' },
  bubble: {
    maxWidth: '75%',
    padding: 10,
    borderRadius: 16,
  },
  bubbleMe: { borderBottomRightRadius: 4 },
  bubbleOther: { borderBottomLeftRadius: 4 },
  senderName: { color: '#6C63FF', fontSize: 12, fontWeight: '700', marginBottom: 4 },
  messageText: { fontSize: 15, lineHeight: 21 },
  timestamp: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 4, textAlign: 'right' },
});
