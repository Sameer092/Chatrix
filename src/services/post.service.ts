import { supabase } from './supabase';
import type { Post, Comment } from '../types';
import { Config } from '../constants/config';

export interface CreatePostData {
  content: string;
  image_urls?: string[];
}

export const postService = {
  async getFeed(page = 0): Promise<Post[]> {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        author:profiles!posts_user_id_fkey(id, username, name, avatar_url, is_online)
      `)
      .order('created_at', { ascending: false })
      .range(page * Config.pagination.feedLimit, (page + 1) * Config.pagination.feedLimit - 1);
    if (error) throw error;

    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId || !data) return data ?? [];

    const postIds = data.map((p) => p.id);
    const { data: likes } = await supabase
      .from('post_likes')
      .select('post_id')
      .eq('user_id', userId)
      .in('post_id', postIds);

    const likedSet = new Set((likes ?? []).map((l) => l.post_id));
    return data.map((p) => ({ ...p, is_liked: likedSet.has(p.id) }));
  },

  async getUserPosts(userId: string, page = 0): Promise<Post[]> {
    const { data, error } = await supabase
      .from('posts')
      .select(`*, author:profiles!posts_user_id_fkey(id, username, name, avatar_url, is_online)`)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(page * Config.pagination.feedLimit, (page + 1) * Config.pagination.feedLimit - 1);
    if (error) throw error;
    return data ?? [];
  },

  async getPost(postId: string): Promise<Post> {
    const { data, error } = await supabase
      .from('posts')
      .select(`*, author:profiles!posts_user_id_fkey(id, username, name, avatar_url, is_online)`)
      .eq('id', postId)
      .single();
    if (error) throw error;
    return data;
  },

  async createPost({ content, image_urls }: CreatePostData, userId: string): Promise<Post> {
    const { data, error } = await supabase
      .from('posts')
      .insert({ user_id: userId, content, image_urls: image_urls ?? [] })
      .select(`*, author:profiles!posts_user_id_fkey(id, username, name, avatar_url, is_online)`)
      .single();
    if (error) throw error;
    return data;
  },

  async updatePost(postId: string, updates: Partial<Post>): Promise<Post> {
    const { data, error } = await supabase
      .from('posts')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', postId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deletePost(postId: string): Promise<void> {
    const { error } = await supabase.from('posts').delete().eq('id', postId);
    if (error) throw error;
  },

  async likePost(postId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('post_likes')
      .insert({ post_id: postId, user_id: userId });
    if (error && error.code !== '23505') throw error;
  },

  async unlikePost(postId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);
    if (error) throw error;
  },

  async getComments(postId: string): Promise<Comment[]> {
    const { data, error } = await supabase
      .from('comments')
      .select(`*, author:profiles!comments_user_id_fkey(id, username, name, avatar_url)`)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async addComment(postId: string, userId: string, content: string): Promise<Comment> {
    const { data, error } = await supabase
      .from('comments')
      .insert({ post_id: postId, user_id: userId, content })
      .select(`*, author:profiles!comments_user_id_fkey(id, username, name, avatar_url)`)
      .single();
    if (error) throw error;
    return data;
  },

  async deleteComment(commentId: string): Promise<void> {
    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    if (error) throw error;
  },
};
