import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@tanstack/react-query';

import { friendService } from '../../../services/friend.service';
import { profileService } from '../../../services/profile.service';
import { chatService } from '../../../services/chat.service';
import { useAuthStore } from '../../../store/authStore';
import { useThemeStore } from '../../../store/themeStore';
import { useDebounce } from '../../../hooks/useDebounce';
import { isUserOnline } from '../../../utils/formatters';
import { Avatar } from '../../../components/ui/Avatar';
import { encodeSharedPost } from '../sharedPost';
import type { Post, Profile } from '../../../types';

interface SharePostModalProps {
  visible: boolean;
  onClose: () => void;
  post: Post;
}

export const SharePostModal: React.FC<SharePostModalProps> = ({ visible, onClose, post }) => {
  const isDark = useThemeStore((s) => s.isDark);
  const userId = useAuthStore((s) => s.user?.id);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Profile[]>([]);
  const debounced = useDebounce(query, 400);

  const { data: friends } = useQuery({
    queryKey: ['friends', userId],
    queryFn: () => friendService.getFriends(userId!),
    enabled: !!userId && visible,
  });

  const { data: searchResults, isFetching } = useQuery({
    queryKey: ['searchUsers', debounced],
    queryFn: () => profileService.searchUsers(debounced),
    enabled: visible && debounced.length >= 2,
  });

  const friendProfiles = ((friends ?? [])
    .map((f) => f.friend)
    .filter(Boolean)) as Profile[];

  const list: Profile[] = debounced.length >= 2 ? (searchResults ?? []) : friendProfiles;

  const isSelected = (id: string) => selected.some((u) => u.id === id);
  const toggle = (p: Profile) =>
    setSelected((prev) =>
      prev.some((u) => u.id === p.id) ? prev.filter((u) => u.id !== p.id) : [...prev, p]
    );

  const { mutate: share, isPending } = useMutation({
    mutationFn: async () => {
      if (!userId) return;
      // Send a single encoded shared-post message; MessageBubble renders it
      // as a tappable card.
      const payload = encodeSharedPost(post);
      for (const user of selected) {
        const conversationId = await chatService.getOrCreateConversation(user.id);
        await chatService.sendMessage({
          conversationId,
          senderId: userId,
          content: payload,
          messageType: 'text',
        });
      }
    },
    onSuccess: () => {
      const n = selected.length;
      setSelected([]);
      setQuery('');
      onClose();
      Alert.alert('Shared', `Post shared with ${n} ${n === 1 ? 'person' : 'people'}.`);
    },
    onError: () => Alert.alert('Error', 'Could not share the post. Please try again.'),
  });

  const bgColor = isDark ? '#0F0F23' : '#FFFFFF';
  const cardBg = isDark ? '#1A1A3E' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#1E293B';
  const subtextColor = isDark ? '#94A3B8' : '#64748B';
  const inputBg = isDark ? '#252550' : '#F1F5F9';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0';

  const canSend = selected.length > 0 && !isPending;

  const renderUser = ({ item }: { item: Profile }) => {
    const checked = isSelected(item.id);
    return (
      <TouchableOpacity
        style={[styles.userRow, { borderBottomColor: borderColor }]}
        onPress={() => toggle(item)}
        activeOpacity={0.7}
      >
        <Avatar uri={item.avatar_url} name={item.name} size={46} isOnline={isUserOnline(item.is_online, item.last_seen)} />
        <View style={styles.userInfo}>
          <Text style={[styles.name, { color: textColor }]}>{item.name}</Text>
          <Text style={[styles.username, { color: subtextColor }]}>@{item.username}</Text>
        </View>
        <View style={[styles.checkbox, checked && styles.checkboxOn, { borderColor: checked ? '#6C63FF' : subtextColor }]}>
          {checked && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: bgColor }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: borderColor }]}>
          <TouchableOpacity onPress={onClose}>
            <Text style={[styles.cancel, { color: subtextColor }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: textColor }]}>Share Post</Text>
          <TouchableOpacity onPress={() => share()} disabled={!canSend}>
            <Text style={[styles.send, { opacity: canSend ? 1 : 0.4 }]}>
              {isPending ? 'Sending…' : `Send${selected.length ? ` (${selected.length})` : ''}`}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <View style={[styles.searchBar, { backgroundColor: inputBg }]}>
            <Ionicons name="search-outline" size={18} color={subtextColor} />
            <TextInput
              style={[styles.searchInput, { color: textColor }]}
              placeholder="Search people by username…"
              placeholderTextColor={subtextColor}
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={18} color={subtextColor} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Selected chips */}
        {selected.length > 0 && (
          <View style={styles.chipsRow}>
            {selected.map((u) => (
              <TouchableOpacity key={u.id} style={styles.chip} onPress={() => toggle(u)}>
                <Text style={styles.chipText}>{u.username}</Text>
                <Ionicons name="close" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={[styles.sectionLabel, { color: subtextColor }]}>
          {debounced.length >= 2 ? 'SEARCH RESULTS' : 'FRIENDS'}
        </Text>

        {/* List */}
        {isFetching && debounced.length >= 2 ? (
          <ActivityIndicator color="#6C63FF" style={{ marginTop: 24 }} />
        ) : (
          <FlatList
            data={list}
            keyExtractor={(item) => item.id}
            renderItem={renderUser}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <Text style={[styles.empty, { color: subtextColor }]}>
                {debounced.length >= 2
                  ? 'No users found.'
                  : 'No friends yet — search for someone by username above.'}
              </Text>
            }
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 0.5,
  },
  cancel: { fontSize: 16 },
  title: { fontSize: 17, fontWeight: '700' },
  send: { fontSize: 16, fontWeight: '700', color: '#6C63FF' },
  searchWrap: { paddingHorizontal: 20, paddingTop: 16 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
  },
  searchInput: { flex: 1, fontSize: 15 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20, paddingTop: 14 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#6C63FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  chipText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    marginTop: 18,
    marginBottom: 6,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    gap: 14,
  },
  userInfo: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600' },
  username: { fontSize: 13, marginTop: 2 },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: '#6C63FF' },
  empty: { textAlign: 'center', fontSize: 14, marginTop: 32, paddingHorizontal: 40, lineHeight: 20 },
});
