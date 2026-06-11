import React, { useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  Dimensions,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { postService } from '../../../services/post.service';
import { notificationService } from '../../../services/notification.service';
import { useAuthStore } from '../../../store/authStore';
import { useThemeStore } from '../../../store/themeStore';
import { Avatar } from '../../../components/ui/Avatar';
import { SharePostModal } from '../components/SharePostModal';
import { formatDistanceToNow } from '../../../utils/formatters';
import type { Comment, Post } from '../../../types';
import type { RootRouteProp, RootNavProp } from '../../../types/navigation.types';

const SCREEN_W = Dimensions.get('window').width;
const CAROUSEL_W = SCREEN_W - 32; // postCard horizontal padding (16 * 2)

/** Swipeable carousel showing every image of the post, with page dots. */
const PostImageCarousel = memo(function PostImageCarousel({ images }: { images: string[] }) {
  const [idx, setIdx] = useState(0);
  if (images.length === 1) {
    return (
      <Image source={{ uri: images[0] }} style={[carouselStyles.image, { marginTop: 14 }]} contentFit="cover" cachePolicy="memory-disk" />
    );
  }
  return (
    <View style={carouselStyles.wrap}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIdx(Math.round(e.nativeEvent.contentOffset.x / CAROUSEL_W))}
      >
        {images.map((uri, i) => (
          <Image
            key={i}
            source={{ uri }}
            style={[carouselStyles.image, { width: CAROUSEL_W }]}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ))}
      </ScrollView>
      <View style={carouselStyles.counter}>
        <Text style={carouselStyles.counterText}>{idx + 1}/{images.length}</Text>
      </View>
      <View style={carouselStyles.dots}>
        {images.map((_, i) => (
          <View key={i} style={[carouselStyles.dot, i === idx && carouselStyles.dotActive]} />
        ))}
      </View>
    </View>
  );
});

const carouselStyles = StyleSheet.create({
  wrap: { marginTop: 14, position: 'relative' },
  image: { width: CAROUSEL_W, height: 300, borderRadius: 14 },
  counter: {
    position: 'absolute',
    top: 22,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  counterText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#94A3B8', opacity: 0.5 },
  dotActive: { backgroundColor: '#6C63FF', opacity: 1, width: 18 },
});

/**
 * Isolated composer: keeps the comment text in its OWN state so typing only
 * re-renders this small bar — not the parent screen / FlatList header. That
 * stops the post card + avatars from re-mounting (and images from flickering)
 * on every keystroke.
 */
const CommentComposer = memo(function CommentComposer({
  onSend,
  posting,
  isDark,
  bottomInset,
}: {
  onSend: (text: string) => void;
  posting: boolean;
  isDark: boolean;
  bottomInset: number;
}) {
  const [text, setText] = useState('');

  const cardBg = isDark ? '#1A1A3E' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#1E293B';
  const subtextColor = isDark ? '#94A3B8' : '#64748B';
  const inputBg = isDark ? '#252550' : '#F1F5F9';
  const borderColor = isDark ? '#2D2D6B' : '#E2E8F0';

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setText('');
    onSend(trimmed);
  };

  const disabled = posting || !text.trim();

  return (
    <View style={[styles.inputBar, { backgroundColor: cardBg, borderTopColor: borderColor, paddingBottom: bottomInset + 8 }]}>
      <TextInput
        style={[styles.input, { backgroundColor: inputBg, color: textColor }]}
        placeholder="Add a comment..."
        placeholderTextColor={subtextColor}
        value={text}
        onChangeText={setText}
        multiline
        maxLength={500}
        returnKeyType="send"
        blurOnSubmit
        onSubmitEditing={submit}
      />
      <TouchableOpacity onPress={submit} disabled={disabled}>
        <View style={[styles.sendBtn, { opacity: disabled ? 0.5 : 1 }]}>
          <Ionicons name="send" size={18} color="#FFFFFF" />
        </View>
      </TouchableOpacity>
    </View>
  );
});

export default function PostDetailScreen() {
  const route = useRoute<RootRouteProp<'PostDetail'>>();
  const navigation = useNavigation<RootNavProp>();
  const insets = useSafeAreaInsets();
  const isDark = useThemeStore((s) => s.isDark);
  const currentUser = useAuthStore((s) => s.user);
  const { postId } = route.params;
  const queryClient = useQueryClient();

  const { data: post } = useQuery({
    queryKey: ['post', postId],
    queryFn: () => postService.getPost(postId),
  });

  const { data: comments, isLoading: loadingComments } = useQuery({
    queryKey: ['comments', postId],
    queryFn: () => postService.getComments(postId),
  });

  const { data: liked } = useQuery({
    queryKey: ['postLiked', postId, currentUser?.id],
    queryFn: () => postService.checkPostLiked(postId, currentUser!.id),
    enabled: !!currentUser?.id,
  });

  // Invalidate everything that shows this post's counts.
  const refreshPostEverywhere = () => {
    queryClient.invalidateQueries({ queryKey: ['post', postId] });
    queryClient.invalidateQueries({ queryKey: ['feed'] });
    queryClient.invalidateQueries({ queryKey: ['userPosts'] });
  };

  const { mutate: toggleLike } = useMutation({
    mutationFn: async () => {
      if (!currentUser?.id) throw new Error('Not authenticated');
      if (liked) {
        await postService.unlikePost(postId, currentUser.id);
      } else {
        await postService.likePost(postId, currentUser.id);
        if (post?.user_id && post.user_id !== currentUser.id) {
          await notificationService.createNotification({
            userId: post.user_id,
            actorId: currentUser.id,
            type: 'like',
            entityId: postId,
            entityType: 'post',
          });
        }
      }
    },
    onMutate: async () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await queryClient.cancelQueries({ queryKey: ['post', postId] });
      const prevPost = queryClient.getQueryData<Post>(['post', postId]);
      const prevLiked = liked;
      queryClient.setQueryData(['postLiked', postId, currentUser?.id], !prevLiked);
      if (prevPost) {
        queryClient.setQueryData(['post', postId], {
          ...prevPost,
          likes_count: prevPost.likes_count + (prevLiked ? -1 : 1),
        });
      }
      return { prevPost, prevLiked };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prevPost) queryClient.setQueryData(['post', postId], ctx.prevPost);
      queryClient.setQueryData(['postLiked', postId, currentUser?.id], ctx?.prevLiked);
    },
    onSettled: refreshPostEverywhere,
  });

  const { mutate: addComment, isPending: posting } = useMutation({
    mutationFn: async (content: string) => {
      if (!currentUser?.id) throw new Error('Not authenticated');
      const comment = await postService.addComment(postId, currentUser.id, content);
      if (post?.user_id && post.user_id !== currentUser.id) {
        await notificationService.createNotification({
          userId: post.user_id,
          actorId: currentUser.id,
          type: 'comment',
          entityId: postId,
          entityType: 'post',
        });
      }
      return comment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      refreshPostEverywhere();
    },
    onError: () => Alert.alert('Error', 'Failed to post comment.'),
  });

  const { mutate: removeComment } = useMutation({
    mutationFn: (commentId: string) => postService.deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      refreshPostEverywhere();
    },
  });

  const isOwner = !!post && post.user_id === currentUser?.id;
  const [showShare, setShowShare] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');

  const { mutate: deletePost } = useMutation({
    mutationFn: () => postService.deletePost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['userPosts'] });
      navigation.goBack();
    },
    onError: () => Alert.alert('Error', 'Could not delete the post.'),
  });

  const { mutate: saveEdit, isPending: savingEdit } = useMutation({
    mutationFn: () => postService.updatePost(postId, { content: editText.trim() }),
    onSuccess: () => {
      setEditing(false);
      refreshPostEverywhere();
    },
    onError: () => Alert.alert('Error', 'Could not update the post.'),
  });

  const openMenu = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isOwner) {
      Alert.alert('Post options', undefined, [
        {
          text: 'Edit post',
          onPress: () => {
            setEditText(post?.content ?? '');
            setEditing(true);
          },
        },
        { text: 'Share to friends', onPress: () => setShowShare(true) },
        {
          text: 'Delete post',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Delete Post', 'This cannot be undone. Delete this post?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => deletePost() },
            ]),
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } else {
      Alert.alert('Post options', undefined, [
        { text: 'Share to friends', onPress: () => setShowShare(true) },
        {
          text: 'Share via…',
          onPress: () => Share.share({ message: post?.content || 'Check out this post on Chatrix' }),
        },
        { text: 'Report', onPress: () => Alert.alert('Reported', 'Thanks, we will review this post.') },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const bgColor = isDark ? '#0F0F23' : '#F8F9FA';
  const cardBg = isDark ? '#1A1A3E' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#1E293B';
  const subtextColor = isDark ? '#94A3B8' : '#64748B';
  const borderColor = isDark ? '#2D2D6B' : '#E2E8F0';

  const renderHeader = useCallback(() => (
    <View style={[styles.postCard, { backgroundColor: cardBg }]}>
      <TouchableOpacity
        style={styles.authorRow}
        onPress={() =>
          post?.author?.id && post.author.id !== currentUser?.id
            ? navigation.navigate('UserProfile', { userId: post.author.id })
            : undefined
        }
      >
        <Avatar uri={post?.author?.avatar_url} name={post?.author?.name ?? ''} size={44} />
        <View style={{ marginLeft: 12 }}>
          <Text style={[styles.authorName, { color: textColor }]}>{post?.author?.name}</Text>
          <Text style={[styles.username, { color: subtextColor }]}>
            @{post?.author?.username}
            {post ? ` · ${formatDistanceToNow(post.created_at)}` : ''}
          </Text>
        </View>
      </TouchableOpacity>

      {post?.content ? (
        <Text style={[styles.postContent, { color: textColor }]}>{post.content}</Text>
      ) : null}

      {post && post.image_urls.length > 0 && (
        <PostImageCarousel images={post.image_urls} />
      )}

      <View style={[styles.metaRow, { borderTopColor: borderColor }]}>
        <TouchableOpacity style={styles.metaItem} onPress={() => toggleLike()} activeOpacity={0.7}>
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={20}
            color={liked ? '#EF4444' : subtextColor}
          />
          <Text style={[styles.metaText, { color: liked ? '#EF4444' : subtextColor }]}>
            {post?.likes_count ?? 0}
          </Text>
        </TouchableOpacity>
        <View style={styles.metaItem}>
          <Ionicons name="chatbubble-outline" size={18} color="#6C63FF" />
          <Text style={[styles.metaText, { color: subtextColor }]}>{post?.comments_count ?? 0}</Text>
        </View>
      </View>

      <Text style={[styles.commentsHeading, { color: textColor }]}>Comments</Text>
    </View>
  ), [post, liked, currentUser?.id, cardBg, textColor, subtextColor, borderColor, navigation, toggleLike]);

  const renderComment = ({ item }: { item: Comment }) => (
    <View style={[styles.commentRow, { backgroundColor: cardBg }]}>
      <Avatar
        uri={item.author?.avatar_url}
        name={item.author?.name ?? ''}
        size={36}
        onPress={() =>
          item.author?.id && item.author.id !== currentUser?.id
            ? navigation.navigate('UserProfile', { userId: item.author.id })
            : undefined
        }
      />
      <View style={styles.commentBody}>
        <View style={styles.commentTop}>
          <Text style={[styles.commentAuthor, { color: textColor }]}>{item.author?.name}</Text>
          <Text style={[styles.commentTime, { color: subtextColor }]}>
            {formatDistanceToNow(item.created_at)}
          </Text>
        </View>
        <Text style={[styles.commentContent, { color: textColor }]}>{item.content}</Text>
      </View>
      {item.user_id === currentUser?.id && (
        <TouchableOpacity
          onPress={() =>
            Alert.alert('Delete comment', 'Remove this comment?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => removeComment(item.id) },
            ])
          }
        >
          <Ionicons name="trash-outline" size={16} color={subtextColor} />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: bgColor }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: cardBg, borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={26} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>Post</Text>
        <TouchableOpacity onPress={openMenu} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="ellipsis-horizontal" size={22} color={textColor} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={comments ?? []}
        keyExtractor={(item) => item.id}
        renderItem={renderComment}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          loadingComments ? (
            <ActivityIndicator color="#6C63FF" style={{ marginTop: 24 }} />
          ) : (
            <Text style={[styles.noComments, { color: subtextColor }]}>
              No comments yet. Be the first!
            </Text>
          )
        }
        contentContainerStyle={{ paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
      />

      <CommentComposer
        onSend={addComment}
        posting={posting}
        isDark={isDark}
        bottomInset={insets.bottom}
      />

      {post && (
        <SharePostModal visible={showShare} onClose={() => setShowShare(false)} post={post} />
      )}

      {/* Edit post (text) */}
      <Modal visible={editing} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditing(false)}>
        <View style={[styles.container, { backgroundColor: bgColor }]}>
          <View style={[styles.header, { paddingTop: 16, backgroundColor: cardBg, borderBottomColor: borderColor }]}>
            <TouchableOpacity onPress={() => setEditing(false)}>
              <Text style={{ color: subtextColor, fontSize: 16 }}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: textColor }]}>Edit Post</Text>
            <TouchableOpacity onPress={() => saveEdit()} disabled={savingEdit}>
              <Text style={{ color: '#6C63FF', fontSize: 16, fontWeight: '700', opacity: savingEdit ? 0.5 : 1 }}>
                {savingEdit ? 'Saving…' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={[styles.editInput, { color: textColor }]}
            value={editText}
            onChangeText={setEditText}
            placeholder="What's on your mind?"
            placeholderTextColor={subtextColor}
            multiline
            autoFocus
            maxLength={500}
          />
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  editInput: { fontSize: 18, lineHeight: 26, padding: 20, minHeight: 140, textAlignVertical: 'top' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
  },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  postCard: { padding: 16, marginBottom: 8 },
  authorRow: { flexDirection: 'row', alignItems: 'center' },
  authorName: { fontSize: 15, fontWeight: '700' },
  username: { fontSize: 12, marginTop: 2 },
  postContent: { fontSize: 16, lineHeight: 24, marginTop: 14 },
  postImage: { width: '100%', height: 260, borderRadius: 14, marginTop: 14 },
  metaRow: {
    flexDirection: 'row',
    gap: 20,
    paddingTop: 14,
    marginTop: 14,
    borderTopWidth: 0.5,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 14, fontWeight: '500' },
  commentsHeading: { fontSize: 16, fontWeight: '700', marginTop: 18 },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  commentBody: { flex: 1 },
  commentTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  commentAuthor: { fontSize: 14, fontWeight: '700' },
  commentTime: { fontSize: 11 },
  commentContent: { fontSize: 14, lineHeight: 20, marginTop: 3 },
  noComments: { textAlign: 'center', fontSize: 14, marginTop: 24 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 0.5,
    gap: 10,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6C63FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
