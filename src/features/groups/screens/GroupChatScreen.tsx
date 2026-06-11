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
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { groupService } from '../../../services/group.service';
import { useAuthStore } from '../../../store/authStore';
import { useThemeStore } from '../../../store/themeStore';
import { MessageInput } from '../../chat/components/MessageInput';
import { MessageBubble } from '../../chat/components/MessageBubble';
import { Avatar } from '../../../components/ui/Avatar';
import { encodeReply, decodeReply, messageSnippet } from '../../chat/replyMessage';
import { decodeSharedPost } from '../../feed/sharedPost';
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
  const [replyingTo, setReplyingTo] = useState<{ sender: string; snippet: string } | null>(null);
  const [editingMsg, setEditingMsg] = useState<GroupMessage | null>(null);
  const [editText, setEditText] = useState('');

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

  // De-duplicate by id (a sent/refetched message can appear in both lists).
  const mergedById = new Map<string, GroupMessage>();
  for (const m of data?.pages.flat() ?? []) mergedById.set(m.id, m);
  for (const m of localMessages) mergedById.set(m.id, m);
  const messages = Array.from(mergedById.values());
  const invertedData = [...messages].reverse();

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

  const bgColor = isDark ? '#0F0F23' : '#F8F9FA';
  const textColor = isDark ? '#FFFFFF' : '#1E293B';
  const subtextColor = isDark ? '#94A3B8' : '#64748B';
  const headerBg = isDark ? '#1A1A3E' : '#FFFFFF';

  const { mutate: deleteMsg } = useMutation({
    mutationFn: (id: string) => groupService.deleteGroupMessage(id),
    onSuccess: (_d, id) => {
      setLocalMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, is_deleted: true, content: null } : m))
      );
      queryClient.invalidateQueries({ queryKey: ['group-messages', groupId] });
    },
    onError: () => Alert.alert('Error', 'Could not delete the message.'),
  });

  const { mutate: editMsg, isPending: savingEdit } = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      groupService.editGroupMessage(id, content),
    onSuccess: (_d, { id, content }) => {
      setLocalMessages((prev) => prev.map((m) => (m.id === id ? { ...m, content } : m)));
      queryClient.invalidateQueries({ queryKey: ['group-messages', groupId] });
      setEditingMsg(null);
    },
    onError: () => Alert.alert('Error', 'Could not edit the message.'),
  });

  const handleLongPress = (message: GroupMessage) => {
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

  const renderMessage = useCallback(
    ({ item, index }: { item: GroupMessage; index: number }) => {
      const isMe = item.sender_id === currentUser?.id;
      const older = invertedData[index + 1];
      const showAvatar = !isMe && (!older || older.sender_id !== item.sender_id);
      return (
        <MessageBubble
          message={item as unknown as Message}
          isMe={isMe}
          showAvatar={showAvatar}
          showSenderName={!isMe}
          onLongPress={() => handleLongPress(item)}
        />
      );
    },
    [currentUser?.id, invertedData]
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
        data={invertedData}
        inverted
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        onEndReached={() => hasNextPage && fetchNextPage()}
        onEndReachedThreshold={0.2}
        contentContainerStyle={[styles.messagesList, { paddingTop: 16 }]}
        showsVerticalScrollIndicator={false}
      />

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
        onTypingChange={() => {}}
        conversationId={groupId}
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
  headerSub: { fontSize: 11, color: '#94A3B8', marginTop: 1 },
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
