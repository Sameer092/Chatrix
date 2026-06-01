import React, { useState, useCallback } from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  Text,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { postService } from '../../../services/post.service';
import { useAuthStore } from '../../../store/authStore';
import { useThemeStore } from '../../../store/themeStore';
import { PostCard } from '../components/PostCard';
import { CreatePostModal } from '../components/CreatePostModal';
import { PostSkeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import type { Post } from '../../../types';

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const isDark = useThemeStore((s) => s.isDark);
  const userId = useAuthStore((s) => s.user?.id);
  const queryClient = useQueryClient();
  const [showCreatePost, setShowCreatePost] = useState(false);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ['feed'],
    queryFn: ({ pageParam = 0 }) => postService.getFeed(pageParam as number),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === 10 ? allPages.length : undefined,
  });

  const posts = data?.pages.flat() ?? [];

  const { mutate: toggleLike } = useMutation({
    mutationFn: async ({ postId, isLiked }: { postId: string; isLiked: boolean }) => {
      if (!userId) return;
      if (isLiked) {
        await postService.unlikePost(postId, userId);
      } else {
        await postService.likePost(postId, userId);
      }
    },
    onMutate: async ({ postId, isLiked }) => {
      await queryClient.cancelQueries({ queryKey: ['feed'] });
      const snapshot = queryClient.getQueryData(['feed']);
      queryClient.setQueryData(['feed'], (old: any) => ({
        ...old,
        pages: old?.pages?.map((page: Post[]) =>
          page.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  is_liked: !isLiked,
                  likes_count: isLiked ? p.likes_count - 1 : p.likes_count + 1,
                }
              : p
          )
        ),
      }));
      return { snapshot };
    },
    onError: (_, __, context) => {
      queryClient.setQueryData(['feed'], context?.snapshot);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });

  const { mutate: deletePost } = useMutation({
    mutationFn: (postId: string) => postService.deletePost(postId),
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ['feed'] });
      const snapshot = queryClient.getQueryData(['feed']);
      queryClient.setQueryData(['feed'], (old: any) => ({
        ...old,
        pages: old?.pages?.map((page: Post[]) => page.filter((p) => p.id !== postId)),
      }));
      return { snapshot };
    },
    onError: (_, __, context) => {
      queryClient.setQueryData(['feed'], context?.snapshot);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['userPosts', userId] });
    },
  });

  const renderItem = useCallback(
    ({ item }: { item: Post }) => (
      <PostCard
        post={item}
        onLike={() => toggleLike({ postId: item.id, isLiked: item.is_liked ?? false })}
        onDelete={(postId) => deletePost(postId)}
      />
    ),
    [toggleLike, deletePost]
  );

  const renderSkeleton = () => (
    <>
      <PostSkeleton />
      <PostSkeleton />
      <PostSkeleton />
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0F0F23' : '#F8F9FA' }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: isDark ? '#0F0F23' : '#F8F9FA' }]}>
        <Text style={[styles.headerTitle, { color: isDark ? '#FFFFFF' : '#1E293B' }]}>
          Chatrix
        </Text>
        <TouchableOpacity
          style={styles.createPostBtn}
          onPress={() => setShowCreatePost(true)}
        >
          <LinearGradient
            colors={['#6C63FF', '#FF6584']}
            style={styles.createPostGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.createPostText}>Post</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <FlatList
        data={isLoading ? [] : posts}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={
          isLoading
            ? renderSkeleton()
            : <EmptyState
                icon="newspaper-outline"
                title="No posts yet"
                message="Be the first to share something with the world"
                actionLabel="Create Post"
                onAction={() => setShowCreatePost(true)}
              />
        }
        ListFooterComponent={isFetchingNextPage ? <PostSkeleton /> : null}
        onEndReached={() => hasNextPage && fetchNextPage()}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#6C63FF"
          />
        }
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 80 },
        ]}
        showsVerticalScrollIndicator={false}
      />

      <CreatePostModal
        visible={showCreatePost}
        onClose={() => setShowCreatePost(false)}
        onSuccess={() => {
          setShowCreatePost(false);
          queryClient.invalidateQueries({ queryKey: ['feed'] });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  createPostBtn: { borderRadius: 20, overflow: 'hidden' },
  createPostGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  createPostText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  listContent: { paddingTop: 8 },
});
