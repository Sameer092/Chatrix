import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { profileService } from '../../../services/profile.service';
import { postService } from '../../../services/post.service';
import { friendService } from '../../../services/friend.service';
import { chatService } from '../../../services/chat.service';
import { notificationService } from '../../../services/notification.service';
import { useAuthStore } from '../../../store/authStore';
import { useThemeStore } from '../../../store/themeStore';
import { Avatar } from '../../../components/ui/Avatar';
import { Button } from '../../../components/ui/Button';
import { isUserOnline } from '../../../utils/formatters';
import { PostCard } from '../../feed/components/PostCard';
import type { RootRouteProp, RootNavProp } from '../../../types/navigation.types';

const { width } = Dimensions.get('window');
const IMAGE_SIZE = (width - 4) / 3;

export default function UserProfileScreen() {
  const route = useRoute<RootRouteProp<'UserProfile'>>();
  const navigation = useNavigation<RootNavProp>();
  const insets = useSafeAreaInsets();
  const isDark = useThemeStore((s) => s.isDark);
  const currentUser = useAuthStore((s) => s.user);
  const { userId } = route.params;
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => profileService.getProfile(userId),
  });

  const { data: posts } = useQuery({
    queryKey: ['userPosts', userId],
    queryFn: () => postService.getUserPosts(userId),
  });

  const { data: friendStatus, refetch: refetchFriendStatus } = useQuery({
    queryKey: ['friendStatus', currentUser?.id, userId],
    queryFn: () => friendService.checkFriendship(currentUser!.id, userId),
    enabled: !!currentUser?.id,
  });

  const { data: friendCount } = useQuery({
    queryKey: ['friendCount', userId],
    queryFn: () => friendService.getFriendCount(userId),
  });

  const { mutate: sendRequest, isPending: sendingRequest } = useMutation({
    mutationFn: () => friendService.sendFriendRequest(currentUser!.id, userId),
    onSuccess: async () => {
      await notificationService.createNotification({
        userId,
        actorId: currentUser!.id,
        type: 'friend_request',
      });
      refetchFriendStatus();
    },
  });

  const { mutate: acceptRequest, isPending: accepting } = useMutation({
    mutationFn: async () => {
      if (!friendStatus?.requestId) return;
      await friendService.acceptFriendRequest(friendStatus.requestId);
      await notificationService.createNotification({
        userId,
        actorId: currentUser!.id,
        type: 'friend_accepted',
      });
    },
    onSuccess: () => {
      refetchFriendStatus();
      queryClient.invalidateQueries({ queryKey: ['friendCount', userId] });
      queryClient.invalidateQueries({ queryKey: ['friends', currentUser?.id] });
    },
  });

  const { mutate: removeFriend } = useMutation({
    mutationFn: () => friendService.unfriend(currentUser!.id, userId),
    onSuccess: () => {
      refetchFriendStatus();
      queryClient.invalidateQueries({ queryKey: ['friendCount', userId] });
    },
  });

  const { mutate: startChat, isPending: chatPending } = useMutation({
    mutationFn: () => chatService.getOrCreateConversation(userId),
    onSuccess: (conversationId) => {
      navigation.navigate('Chat', {
        conversationId,
        userId,
        username: profile?.username ?? '',
        avatar: profile?.avatar_url ?? undefined,
      });
    },
  });

  const bgColor = isDark ? '#0F0F23' : '#F8F9FA';
  const textColor = isDark ? '#FFFFFF' : '#1E293B';
  const subtextColor = isDark ? '#94A3B8' : '#64748B';
  const cardBg = isDark ? '#1A1A3E' : '#FFFFFF';

  const renderFriendButton = () => {
    if (!friendStatus) return null;
    if (friendStatus.isFriend) {
      return (
        <Button
          title="Friends"
          variant="secondary"
          size="md"
          style={{ width: '100%' }}
          leftIcon={<Ionicons name="checkmark" size={16} color="#FFFFFF" />}
          onPress={() =>
            Alert.alert('Unfriend', `Remove ${profile?.name ?? 'this user'} from friends?`, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Remove', style: 'destructive', onPress: () => removeFriend() },
            ])
          }
        />
      );
    }
    if (friendStatus.requestSent) {
      return <Button title="Requested" variant="outline" size="md" style={{ width: '100%' }} onPress={() => {}} />;
    }
    if (friendStatus.requestReceived) {
      return (
        <Button
          title="Accept"
          variant="primary"
          size="md"
          gradient
          style={{ width: '100%' }}
          loading={accepting}
          onPress={() => acceptRequest()}
        />
      );
    }
    return (
      <Button
        title="Add Friend"
        variant="primary"
        size="md"
        gradient
        style={{ width: '100%' }}
        loading={sendingRequest}
        onPress={() => sendRequest()}
      />
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: bgColor }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
    >
      {/* Cover + Back */}
      <View style={styles.coverContainer}>
        {profile?.cover_url ? (
          <Image source={{ uri: profile.cover_url }} style={styles.cover} contentFit="cover" />
        ) : (
          <LinearGradient colors={['#1A1A3E', '#252550']} style={styles.cover} />
        )}
        <TouchableOpacity
          style={[styles.backBtn, { top: insets.top + 8 }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Profile Info */}
      <View style={[styles.profileSection, { backgroundColor: cardBg }]}>
        <View style={styles.avatarRow}>
          <View style={[styles.avatarWrapper, { backgroundColor: cardBg }]}>
            <Avatar
              uri={profile?.avatar_url}
              name={profile?.name ?? ''}
              size={84}
              isOnline={isUserOnline(profile?.is_online, profile?.last_seen)}
              borderColor="#6C63FF"
              borderWidth={3}
            />
          </View>
        </View>

        <Text style={[styles.name, { color: textColor }]}>{profile?.name}</Text>
        <Text style={[styles.username, { color: subtextColor }]}>@{profile?.username}</Text>
        {profile?.bio && <Text style={[styles.bio, { color: textColor }]}>{profile.bio}</Text>}

        {/* Action buttons — full-width row */}
        <View style={styles.actions}>
          <View style={styles.actionItem}>{renderFriendButton()}</View>
          <View style={styles.actionItem}>
            <Button
              title="Message"
              variant="secondary"
              size="md"
              loading={chatPending}
              onPress={() => startChat()}
              leftIcon={<Ionicons name="chatbubble-outline" size={16} color="#FFFFFF" />}
            />
          </View>
        </View>

        <View style={[styles.statsRow, { borderTopColor: isDark ? '#2D2D6B' : '#E2E8F0' }]}>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: textColor }]}>{posts?.length ?? 0}</Text>
            <Text style={[styles.statLabel, { color: subtextColor }]}>Posts</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: isDark ? '#2D2D6B' : '#E2E8F0' }]} />
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: textColor }]}>{friendCount ?? 0}</Text>
            <Text style={[styles.statLabel, { color: subtextColor }]}>Friends</Text>
          </View>
        </View>
      </View>

      {/* Posts Grid */}
      <View style={styles.grid}>
        {(posts ?? []).map((post) => (
          <TouchableOpacity
            key={post.id}
            style={styles.gridItem}
            onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
          >
            {post.image_urls.length > 0 ? (
              <Image
                source={{ uri: post.image_urls[0] }}
                style={styles.gridImage}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
            ) : (
              <View style={[styles.gridImage, { backgroundColor: isDark ? '#252550' : '#F1F5F9', alignItems: 'center', justifyContent: 'center', padding: 8 }]}>
                <Text style={[{ color: textColor, fontSize: 11, lineHeight: 15 }]} numberOfLines={5}>{post.content}</Text>
              </View>
            )}
            {post.image_urls.length > 1 && (
              <View style={styles.multiBadge}>
                <Ionicons name="copy" size={14} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  coverContainer: { height: 200, position: 'relative' },
  cover: { width: '100%', height: 200 },
  backBtn: {
    position: 'absolute',
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 8,
    borderRadius: 20,
  },
  profileSection: {
    marginTop: -24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: -46,
    marginBottom: 4,
  },
  avatarWrapper: {
    padding: 3,
    backgroundColor: '#0F0F23',
    borderRadius: 48,
  },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  actionItem: { flex: 1 },
  name: { fontSize: 22, fontWeight: '800', marginTop: 12, letterSpacing: -0.3 },
  username: { fontSize: 14, marginTop: 2, marginBottom: 8 },
  bio: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  statsRow: {
    flexDirection: 'row',
    paddingTop: 16,
    marginTop: 16,
    borderTopWidth: 0.5,
    paddingBottom: 16,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 12, marginTop: 2 },
  statDivider: { width: 1, marginVertical: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2, marginTop: 2 },
  gridItem: { width: IMAGE_SIZE, height: IMAGE_SIZE, position: 'relative' },
  gridImage: { width: IMAGE_SIZE, height: IMAGE_SIZE },
  multiBadge: { position: 'absolute', top: 6, right: 6 },
});
