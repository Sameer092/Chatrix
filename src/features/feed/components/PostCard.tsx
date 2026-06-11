import React, { memo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Share,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { formatDistanceToNow, isUserOnline } from '../../../utils/formatters';
import { Avatar } from '../../../components/ui/Avatar';
import { SharePostModal } from './SharePostModal';
import { useThemeStore } from '../../../store/themeStore';
import { useAuthStore } from '../../../store/authStore';
import type { Post } from '../../../types';
import type { RootNavProp } from '../../../types/navigation.types';

const { width } = Dimensions.get('window');

interface PostCardProps {
  post: Post;
  onLike: () => void;
  onDelete?: (postId: string) => void;
}

export const PostCard = memo(({ post, onLike, onDelete }: PostCardProps) => {
  const isDark = useThemeStore((s) => s.isDark);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const navigation = useNavigation<RootNavProp>();

  const [showShare, setShowShare] = useState(false);

  const heartScale = useSharedValue(1);
  const heartAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  const isOwnPost = post.author?.id === currentUserId || post.user_id === currentUserId;

  const handleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    heartScale.value = withSequence(
      withSpring(1.4, { damping: 4, stiffness: 200 }),
      withSpring(1, { damping: 8, stiffness: 200 })
    );
    onLike();
  };

  const openDetail = () => navigation.navigate('PostDetail', { postId: post.id });

  const handleProfilePress = () => {
    if (!isOwnPost && post.author?.id) {
      navigation.navigate('UserProfile', { userId: post.author.id });
    }
  };

  const handleImagePress = (index: number) => {
    navigation.navigate('ImageViewer', {
      uri: post.image_urls[index],
      uris: post.image_urls,
      index,
    });
  };

  const handleShareToFriends = () => setShowShare(true);

  const handleExternalShare = async () => {
    try {
      await Share.share({
        message: post.content
          ? `${post.author?.name} on Chatrix:\n\n${post.content}`
          : `Check out ${post.author?.name}'s post on Chatrix`,
      });
    } catch {
      // user dismissed
    }
  };

  const handleMore = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isOwnPost) {
      Alert.alert('Post options', undefined, [
        { text: 'Share to friends', onPress: handleShareToFriends },
        { text: 'Share via…', onPress: handleExternalShare },
        {
          text: 'Delete Post',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Delete Post', 'This cannot be undone. Delete this post?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => onDelete?.(post.id) },
            ]),
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } else {
      Alert.alert('Post options', undefined, [
        { text: 'Share to friends', onPress: handleShareToFriends },
        { text: 'Share via…', onPress: handleExternalShare },
        { text: 'Report', onPress: () => Alert.alert('Reported', 'Thanks, we will review this post.') },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const bgColor = isDark ? '#1A1A3E' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#1E293B';
  const subtextColor = isDark ? '#94A3B8' : '#64748B';

  return (
    <View style={[styles.card, { backgroundColor: bgColor }]}>
      {/* Author Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.authorRow} onPress={handleProfilePress}>
          <Avatar
            uri={post.author?.avatar_url}
            name={post.author?.name ?? ''}
            size={44}
            isOnline={isUserOnline(post.author?.is_online, post.author?.last_seen)}
          />
          <View style={styles.authorInfo}>
            <Text style={[styles.authorName, { color: textColor }]}>{post.author?.name}</Text>
            <Text style={[styles.username, { color: subtextColor }]}>
              @{post.author?.username} · {formatDistanceToNow(post.created_at)}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.moreBtn} onPress={handleMore} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="ellipsis-horizontal" size={20} color={subtextColor} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {post.content ? (
        <TouchableOpacity activeOpacity={0.7} onPress={openDetail}>
          <Text style={[styles.content, { color: textColor }]}>{post.content}</Text>
        </TouchableOpacity>
      ) : null}

      {/* Images */}
      {post.image_urls.length > 0 && (
        <View style={styles.imagesContainer}>
          {post.image_urls.length === 1 ? (
            <TouchableOpacity activeOpacity={0.9} onPress={() => handleImagePress(0)}>
              <Image
                source={{ uri: post.image_urls[0] }}
                style={styles.singleImage}
                contentFit="cover"
                transition={200}
                cachePolicy="memory-disk"
              />
            </TouchableOpacity>
          ) : (
            <View style={styles.imageGrid}>
              {post.image_urls.slice(0, 4).map((uri, idx) => (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.9}
                  onPress={() => handleImagePress(idx)}
                >
                  <Image
                    source={{ uri }}
                    style={[
                      styles.gridImage,
                      post.image_urls.length === 3 && idx === 0 && styles.gridImageWide,
                    ]}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Actions */}
      <View style={[styles.actions, { borderTopColor: isDark ? '#2D2D6B' : '#E2E8F0' }]}>
        <TouchableOpacity style={styles.action} onPress={handleLike}>
          <Animated.View style={heartAnimStyle}>
            <Ionicons
              name={post.is_liked ? 'heart' : 'heart-outline'}
              size={22}
              color={post.is_liked ? '#EF4444' : subtextColor}
            />
          </Animated.View>
          <Text style={[styles.actionText, { color: post.is_liked ? '#EF4444' : subtextColor }]}>
            {post.likes_count}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.action} onPress={openDetail}>
          <Ionicons name="chatbubble-outline" size={22} color={subtextColor} />
          <Text style={[styles.actionText, { color: subtextColor }]}>{post.comments_count}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.action} onPress={handleShareToFriends}>
          <Ionicons name="share-social-outline" size={22} color={subtextColor} />
        </TouchableOpacity>
      </View>

      <SharePostModal visible={showShare} onClose={() => setShowShare(false)} post={post} />
    </View>
  );
});

PostCard.displayName = 'PostCard';

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 12,
  },
  authorRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  authorInfo: { marginLeft: 12, flex: 1 },
  authorName: { fontSize: 15, fontWeight: '700' },
  username: { fontSize: 12, marginTop: 2 },
  moreBtn: { padding: 4 },
  content: { fontSize: 15, lineHeight: 22, paddingHorizontal: 16, paddingBottom: 12 },
  imagesContainer: { marginBottom: 4 },
  singleImage: { width: '100%', height: 240 },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  gridImage: { width: (width - 40) / 2, height: 160 },
  gridImageWide: { width: '100%', height: 200 },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 24,
  },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { fontSize: 14, fontWeight: '500' },
});
