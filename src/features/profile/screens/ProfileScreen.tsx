import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { postService } from '../../../services/post.service';
import { friendService } from '../../../services/friend.service';
import { useAuthStore } from '../../../store/authStore';
import { useThemeStore } from '../../../store/themeStore';
import { authService } from '../../../services/auth.service';
import { Avatar } from '../../../components/ui/Avatar';
import type { RootNavProp } from '../../../types/navigation.types';
import type { Post } from '../../../types';

const { width } = Dimensions.get('window');
const IMAGE_SIZE = (width - 4) / 3;

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const isDark = useThemeStore((s) => s.isDark);
  const profile = useAuthStore((s) => s.profile);
  const { clearAuth } = useAuthStore();
  const navigation = useNavigation<RootNavProp>();
  const queryClient = useQueryClient();

  const { data: posts, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['userPosts', profile?.id],
    queryFn: () => postService.getUserPosts(profile!.id),
    enabled: !!profile?.id,
  });

  const { data: friendCount } = useQuery({
    queryKey: ['friendCount', profile?.id],
    queryFn: () => friendService.getFriendCount(profile!.id),
    enabled: !!profile?.id,
  });

  const handleSignOut = async () => {
    await authService.signOut();
    queryClient.clear();
    clearAuth();
  };

  const bgColor = isDark ? '#0F0F23' : '#F8F9FA';
  const textColor = isDark ? '#FFFFFF' : '#1E293B';
  const subtextColor = isDark ? '#94A3B8' : '#64748B';
  const cardBg = isDark ? '#1A1A3E' : '#FFFFFF';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: bgColor }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#6C63FF" />
      }
      contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
    >
      {/* Cover Photo */}
      <View style={styles.coverContainer}>
        {profile?.cover_url ? (
          <Image source={{ uri: profile.cover_url }} style={styles.cover} contentFit="cover" />
        ) : (
          <LinearGradient colors={['#1A1A3E', '#252550']} style={styles.cover} />
        )}
        <View style={[styles.coverOverlay, { paddingTop: insets.top }]}>
          <TouchableOpacity style={styles.settingsBtn} onPress={() => navigation.navigate('Settings')}>
            <Ionicons name="settings-outline" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Profile Info */}
      <View style={[styles.profileSection, { backgroundColor: cardBg }]}>
        <View style={styles.avatarRow}>
          <View style={styles.avatarWrapper}>
            <Avatar
              uri={profile?.avatar_url}
              name={profile?.name ?? ''}
              size={88}
              borderColor="#6C63FF"
              borderWidth={3}
            />
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.editBtn, { borderColor: isDark ? '#2D2D6B' : '#E2E8F0' }]}
              onPress={() => navigation.navigate('EditProfile')}
            >
              <Text style={[styles.editBtnText, { color: textColor }]}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.friendsBtn, { borderColor: isDark ? '#2D2D6B' : '#E2E8F0' }]}
              onPress={() => navigation.navigate('Friends')}
            >
              <Ionicons name="people-outline" size={18} color={textColor} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={[styles.name, { color: textColor }]}>{profile?.name}</Text>
        <Text style={[styles.username, { color: subtextColor }]}>@{profile?.username}</Text>
        {profile?.bio ? (
          <Text style={[styles.bio, { color: textColor }]}>{profile.bio}</Text>
        ) : null}

        {/* Stats */}
        <View style={[styles.statsRow, { borderTopColor: isDark ? '#2D2D6B' : '#E2E8F0' }]}>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: textColor }]}>{posts?.length ?? 0}</Text>
            <Text style={[styles.statLabel, { color: subtextColor }]}>Posts</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: isDark ? '#2D2D6B' : '#E2E8F0' }]} />
          <TouchableOpacity style={styles.stat} onPress={() => navigation.navigate('Friends')}>
            <Text style={[styles.statValue, { color: textColor }]}>{friendCount ?? 0}</Text>
            <Text style={[styles.statLabel, { color: subtextColor }]}>Friends</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Posts Grid */}
      <View style={styles.gridContainer}>
        {(posts ?? []).length === 0 && !isLoading ? (
          <View style={styles.emptyPosts}>
            <Ionicons name="grid-outline" size={40} color={subtextColor} />
            <Text style={[styles.emptyPostsText, { color: subtextColor }]}>No posts yet</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {(posts ?? []).map((post: Post) => (
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
                  <View style={[styles.gridImage, styles.textPostPreview, { backgroundColor: isDark ? '#252550' : '#F1F5F9' }]}>
                    <Text style={[styles.textPostContent, { color: textColor }]} numberOfLines={4}>
                      {post.content}
                    </Text>
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
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  coverContainer: { height: 180, position: 'relative' },
  cover: { width: '100%', height: 180 },
  coverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  settingsBtn: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 8,
    borderRadius: 20,
  },
  profileSection: {
    marginTop: -20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  avatarRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: -44 },
  avatarWrapper: {
    padding: 3,
    backgroundColor: '#0F0F23',
    borderRadius: 48,
  },
  actionButtons: { flexDirection: 'row', gap: 10, paddingBottom: 4 },
  editBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  editBtnText: { fontWeight: '600', fontSize: 14 },
  friendsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  gridContainer: { marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  gridItem: { width: IMAGE_SIZE, height: IMAGE_SIZE, position: 'relative' },
  gridImage: { width: IMAGE_SIZE, height: IMAGE_SIZE },
  multiBadge: { position: 'absolute', top: 6, right: 6 },
  textPostPreview: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textPostContent: { fontSize: 12, lineHeight: 16, textAlign: 'center' },
  emptyPosts: { alignItems: 'center', padding: 48, gap: 12 },
  emptyPostsText: { fontSize: 15 },
});
