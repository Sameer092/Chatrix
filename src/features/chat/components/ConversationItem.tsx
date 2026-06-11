import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../../../components/ui/Avatar';
import { useThemeStore } from '../../../store/themeStore';
import { formatDistanceToNow, formatTime, isUserOnline } from '../../../utils/formatters';
import { messageSnippet } from '../replyMessage';
import type { Conversation } from '../../../types';

interface ConversationItemProps {
  conversation: Conversation;
  onPress: () => void;
}

export const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  onPress,
}) => {
  const isDark = useThemeStore((s) => s.isDark);
  const other = conversation.other_member;
  const lastMsg = conversation.last_message;

  const textColor = isDark ? '#FFFFFF' : '#1E293B';
  const subtextColor = isDark ? '#94A3B8' : '#64748B';
  const borderColor = isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0';

  const getPreview = () => {
    if (!lastMsg) return 'No messages yet';
    return messageSnippet(lastMsg);
  };

  return (
    <TouchableOpacity
      style={[styles.container, { borderBottomColor: borderColor }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Avatar
        uri={other?.avatar_url}
        name={other?.name ?? ''}
        size={52}
        isOnline={isUserOnline(other?.is_online, other?.last_seen)}
      />
      <View style={styles.info}>
        <View style={styles.topRow}>
          <Text style={[styles.name, { color: textColor }]} numberOfLines={1}>
            {other?.name ?? 'Unknown'}
          </Text>
          <Text style={[styles.time, { color: subtextColor }]}>
            {lastMsg ? formatDistanceToNow(lastMsg.created_at) : ''}
          </Text>
        </View>
        <View style={styles.bottomRow}>
          <Text style={[styles.preview, { color: subtextColor }]} numberOfLines={1}>
            {getPreview()}
          </Text>
          {(conversation.unread_count ?? 0) > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {conversation.unread_count! > 99 ? '99+' : conversation.unread_count}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  info: { flex: 1, marginLeft: 14 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  name: { fontSize: 16, fontWeight: '700', flex: 1, marginRight: 8 },
  time: { fontSize: 12 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  preview: { fontSize: 14, flex: 1, marginRight: 8 },
  badge: {
    backgroundColor: '#6C63FF',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
});
