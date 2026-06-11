import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
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
import { encodeReply, decodeReply, messageSnippet } from '../replyMessage';
import { decodeSharedPost } from '../../feed/sharedPost';
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
  const [replyingTo, setReplyingTo] = useState<{ sender: string; snippet: string } | null>(null);
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const [editText, setEditText] = useState('');
  const typingUsers = useChatStore((s) => s.getTypingUsers(conversationId));
  const addTypingUser = useChatStore((s) => s.addTypingUser);
  const removeTypingUser = useChatStore((s) => s.removeTypingUser);

  const { data, fetchNextPage, hasNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['messages', conversationId],
    queryFn: ({ pageParam = 0 }) => chatService.getMessages(conversationId, pageParam as number),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === 30 ? allPages.length : undefined,
    // Always pull fresh messages when the chat opens (cached data could be
    // missing a message that was added while the screen was closed).
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Merge fetched pages with locally-added messages, de-duplicating by id so a
  // message that exists in both (e.g. just-sent, then refetched) doesn't cause
  // duplicate React keys. The local copy wins (it holds optimistic edits/deletes).
  const mergedById = new Map<string, Message>();
  for (const m of data?.pages.flat() ?? []) mergedById.set(m.id, m);
  for (const m of localMessages) mergedById.set(m.id, m);
  const messages = Array.from(mergedById.values());
  // Inverted list data: newest first. An inverted FlatList renders index 0 at
  // the visual bottom, so the chat opens already pinned to the newest message
  // (no post-render scroll/jump) and new messages appear at the bottom.
  const invertedData = [...messages].reverse();

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

  const { mutate: deleteMsg } = useMutation({
    mutationFn: (id: string) => chatService.deleteMessage(id),
    onSuccess: (_d, id) => {
      setLocalMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, is_deleted: true, content: null } : m))
      );
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
    },
    onError: () => Alert.alert('Error', 'Could not delete the message.'),
  });

  const { mutate: editMsg, isPending: savingEdit } = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      chatService.editMessage(id, content),
    onSuccess: (_d, { id, content }) => {
      setLocalMessages((prev) => prev.map((m) => (m.id === id ? { ...m, content } : m)));
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      setEditingMsg(null);
    },
    onError: () => Alert.alert('Error', 'Could not edit the message.'),
  });

  const handleLongPress = (message: Message) => {
    if (message.is_deleted) return;
    const isMine = message.sender_id === currentUser?.id;
    const isPlainText =
      message.message_type === 'text' &&
      !decodeSharedPost(message.content) &&
      !decodeReply(message.content);

    const options: any[] = [
      {
        text: 'Reply',
        onPress: () =>
          setReplyingTo({
            sender: isMine ? 'yourself' : message.sender?.name ?? 'user',
            snippet: messageSnippet(message),
          }),
      },
    ];
    if (isMine && isPlainText) {
      options.push({
        text: 'Edit',
        onPress: () => {
          setEditText(message.content ?? '');
          setEditingMsg(message);
        },
      });
    }
    if (isMine) {
      options.push({
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Delete message', 'Delete this message?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteMsg(message.id) },
          ]),
      });
    }
    options.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Message', undefined, options);
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMe = item.sender_id === currentUser?.id;
    // In an inverted list the message visually above is the next (older) one.
    const older = invertedData[index + 1];
    const showAvatar = !isMe && (!older || older.sender_id !== item.sender_id);
    return (
      <MessageBubble
        message={item}
        isMe={isMe}
        showAvatar={showAvatar}
        onLongPress={() => handleLongPress(item)}
      />
    );
  };

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
        data={invertedData}
        inverted
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        onEndReached={() => hasNextPage && fetchNextPage()}
        onEndReachedThreshold={0.2}
        contentContainerStyle={[styles.messagesList, { paddingTop: 16 }]}
        showsVerticalScrollIndicator={false}
      />

      {typingUsers.length > 0 && (
        <TypingIndicator />
      )}

      {replyingTo && (
        <View style={[styles.replyBar, { backgroundColor: headerBg, borderTopColor: subtextColor }]}>
          <View style={styles.replyBarAccent} />
          <View style={{ flex: 1 }}>
            <Text style={styles.replyBarTitle}>Replying to {replyingTo.sender}</Text>
            <Text style={[styles.replyBarSnippet, { color: subtextColor }]} numberOfLines={1}>
              {replyingTo.snippet}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setReplyingTo(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={20} color={subtextColor} />
          </TouchableOpacity>
        </View>
      )}

      <MessageInput
        onSend={(content, type, fileData) => {
          const finalContent =
            type === 'text' && replyingTo && content
              ? encodeReply(content, replyingTo.sender, replyingTo.snippet)
              : content;
          sendMessage({
            content: finalContent,
            messageType: type,
            fileUrl: fileData?.url,
            fileName: fileData?.name,
            fileSize: fileData?.size,
            duration: fileData?.duration,
          });
          setReplyingTo(null);
        }}
        onTypingChange={(isTyping) => {
          if (!currentUser?.id) return;
          chatService.broadcastTyping(conversationId, currentUser.id, isTyping);
        }}
        conversationId={conversationId}
      />

      {/* Edit message */}
      <Modal visible={!!editingMsg} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditingMsg(null)}>
        <View style={[styles.container, { backgroundColor: bgColor }]}>
          <View style={[styles.header, { paddingTop: 16, backgroundColor: headerBg }]}>
            <TouchableOpacity onPress={() => setEditingMsg(null)}>
              <Text style={{ color: subtextColor, fontSize: 16 }}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.headerName, { color: textColor, flex: 1, textAlign: 'center' }]}>Edit Message</Text>
            <TouchableOpacity
              onPress={() => editingMsg && editText.trim() && editMsg({ id: editingMsg.id, content: editText.trim() })}
              disabled={savingEdit}
            >
              <Text style={{ color: '#6C63FF', fontSize: 16, fontWeight: '700', opacity: savingEdit ? 0.5 : 1 }}>
                {savingEdit ? 'Saving…' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={{ color: textColor, fontSize: 17, padding: 20, minHeight: 120, textAlignVertical: 'top' }}
            value={editText}
            onChangeText={setEditText}
            multiline
            autoFocus
            maxLength={1000}
          />
        </View>
      </Modal>
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
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 0.5,
    gap: 10,
  },
  replyBarAccent: { width: 3, alignSelf: 'stretch', backgroundColor: '#6C63FF', borderRadius: 2 },
  replyBarTitle: { color: '#6C63FF', fontSize: 13, fontWeight: '700' },
  replyBarSnippet: { fontSize: 12, marginTop: 1 },
});
