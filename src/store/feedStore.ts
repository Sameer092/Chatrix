import { create } from 'zustand';
import type { Post } from '../types';

interface FeedState {
  posts: Post[];
  setPosts: (posts: Post[]) => void;
  prependPost: (post: Post) => void;
  updatePost: (postId: string, updates: Partial<Post>) => void;
  removePost: (postId: string) => void;
  toggleLikeOptimistic: (postId: string, userId: string) => void;
}

export const useFeedStore = create<FeedState>((set) => ({
  posts: [],
  setPosts: (posts) => set({ posts }),
  prependPost: (post) => set((state) => ({ posts: [post, ...state.posts] })),
  updatePost: (postId, updates) =>
    set((state) => ({
      posts: state.posts.map((p) => (p.id === postId ? { ...p, ...updates } : p)),
    })),
  removePost: (postId) =>
    set((state) => ({ posts: state.posts.filter((p) => p.id !== postId) })),
  toggleLikeOptimistic: (postId, _userId) =>
    set((state) => ({
      posts: state.posts.map((p) =>
        p.id === postId
          ? {
              ...p,
              is_liked: !p.is_liked,
              likes_count: p.is_liked ? p.likes_count - 1 : p.likes_count + 1,
            }
          : p
      ),
    })),
}));
