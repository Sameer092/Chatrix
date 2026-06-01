import * as FileSystem from 'expo-file-system';
import { supabase } from './supabase';
import { Config } from '../constants/config';

export const storageService = {
  /**
   * Uploads a local file URI to Supabase Storage.
   *
   * Uses expo-file-system's native binary upload (uploadAsync) instead of
   * reading the file into a base64 string + atob(). atob is NOT available in
   * the React Native (Hermes) runtime, so the old approach threw on every
   * upload. uploadAsync streams the raw bytes straight to the Storage REST
   * endpoint, which is faster and works for images, audio and documents.
   */
  async uploadFile(
    bucket: string,
    path: string,
    uri: string,
    contentType: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) throw new Error('File not found');

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) throw new Error('Not authenticated');

    const uploadUrl = `${Config.supabaseUrl}/storage/v1/object/${bucket}/${encodeURI(path)}`;

    const response = await FileSystem.uploadAsync(uploadUrl, uri, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: Config.supabaseAnonKey,
        'Content-Type': contentType,
        'x-upsert': 'true',
        'cache-control': '3600',
      },
    });

    if (response.status !== 200 && response.status !== 201) {
      throw new Error(`Upload failed (${response.status}): ${response.body}`);
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
    return urlData.publicUrl;
  },

  async uploadAvatar(userId: string, uri: string): Promise<string> {
    const ext = uri.split('.').pop() ?? 'jpg';
    const path = `${userId}/avatar.${ext}`;
    return this.uploadFile(Config.storage.buckets.avatars, path, uri, `image/${ext}`);
  },

  async uploadCover(userId: string, uri: string): Promise<string> {
    const ext = uri.split('.').pop() ?? 'jpg';
    const path = `${userId}/cover.${ext}`;
    return this.uploadFile(Config.storage.buckets.covers, path, uri, `image/${ext}`);
  },

  async uploadPostImage(userId: string, postId: string, uri: string, index: number): Promise<string> {
    const ext = uri.split('.').pop() ?? 'jpg';
    const path = `${userId}/${postId}_${index}.${ext}`;
    return this.uploadFile(Config.storage.buckets.posts, path, uri, `image/${ext}`);
  },

  async uploadMessageFile(
    userId: string,
    conversationId: string,
    uri: string,
    type: 'image' | 'voice' | 'file',
    fileName?: string
  ): Promise<{ url: string; name: string; size: number }> {
    const name = fileName ?? `${Date.now()}.${uri.split('.').pop()}`;
    const path = `${userId}/${conversationId}/${name}`;
    const contentType = type === 'image' ? 'image/jpeg' : type === 'voice' ? 'audio/mpeg' : 'application/octet-stream';
    const url = await this.uploadFile(Config.storage.buckets.messages, path, uri, contentType);
    const info = await FileSystem.getInfoAsync(uri);
    return { url, name, size: (info as any).size ?? 0 };
  },

  async uploadGroupAvatar(groupId: string, uri: string): Promise<string> {
    const ext = uri.split('.').pop() ?? 'jpg';
    const path = `${groupId}/avatar.${ext}`;
    return this.uploadFile(Config.storage.buckets.groups, path, uri, `image/${ext}`);
  },

  getPublicUrl(bucket: string, path: string): string {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  },

  async deleteFile(bucket: string, path: string): Promise<void> {
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) throw error;
  },
};
