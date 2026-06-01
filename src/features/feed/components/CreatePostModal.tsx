import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';

import { postService } from '../../../services/post.service';
import { storageService } from '../../../services/storage.service';
import { useAuthStore } from '../../../store/authStore';
import { useThemeStore } from '../../../store/themeStore';
import { Avatar } from '../../../components/ui/Avatar';

interface CreatePostModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const insets = useSafeAreaInsets();
  const isDark = useThemeStore((s) => s.isDark);
  const profile = useAuthStore((s) => s.profile);
  const userId = useAuthStore((s) => s.user?.id);
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);

  const { mutate: createPost, isPending } = useMutation({
    mutationFn: async () => {
      if (!userId) return;
      let imageUrls: string[] = [];
      if (images.length > 0) {
        const postId = `${Date.now()}`;
        imageUrls = await Promise.all(
          images.map((uri, idx) =>
            storageService.uploadPostImage(userId, postId, uri, idx)
          )
        );
      }
      await postService.createPost({ content: content.trim(), image_urls: imageUrls }, userId);
    },
    onSuccess: () => {
      setContent('');
      setImages([]);
      onSuccess();
    },
    onError: () => Alert.alert('Error', 'Failed to create post. Please try again.'),
  });

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 4,
    });
    if (!result.canceled) {
      setImages(result.assets.map((a) => a.uri).slice(0, 4));
    }
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handlePost = () => {
    if (!content.trim() && images.length === 0) return;
    createPost();
  };

  const bgColor = isDark ? '#0F0F23' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#1E293B';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, { backgroundColor: bgColor }]}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={onClose}>
            <Text style={[styles.cancelText, { color: '#94A3B8' }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textColor }]}>New Post</Text>
          <TouchableOpacity onPress={handlePost} disabled={isPending || (!content.trim() && images.length === 0)}>
            <LinearGradient
              colors={['#6C63FF', '#FF6584']}
              style={[styles.postBtn, { opacity: isPending || (!content.trim() && images.length === 0) ? 0.5 : 1 }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.postBtnText}>{isPending ? 'Posting...' : 'Post'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.authorRow}>
            <Avatar uri={profile?.avatar_url} name={profile?.name ?? ''} size={44} />
            <View style={styles.authorInfo}>
              <Text style={[styles.name, { color: textColor }]}>{profile?.name}</Text>
              <Text style={{ color: '#94A3B8', fontSize: 13 }}>@{profile?.username}</Text>
            </View>
          </View>

          <TextInput
            style={[styles.input, { color: textColor }]}
            placeholder="What's on your mind?"
            placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
            value={content}
            onChangeText={setContent}
            multiline
            autoFocus
            maxLength={500}
          />

          {images.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesRow}>
              {images.map((uri, idx) => (
                <View key={idx} style={styles.imagePreviewContainer}>
                  <Image source={{ uri }} style={styles.imagePreview} contentFit="cover" />
                  <TouchableOpacity style={styles.removeImage} onPress={() => removeImage(idx)}>
                    <Ionicons name="close-circle" size={22} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </ScrollView>

        <View style={[styles.toolbar, { borderTopColor: isDark ? '#2D2D6B' : '#E2E8F0', paddingBottom: insets.bottom + 8 }]}>
          <TouchableOpacity style={styles.toolbarBtn} onPress={pickImages}>
            <Ionicons name="image-outline" size={26} color="#6C63FF" />
            <Text style={styles.toolbarBtnText}>Photo</Text>
          </TouchableOpacity>
          <Text style={{ color: '#64748B', fontSize: 12 }}>
            {content.length}/500
          </Text>
        </View>
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
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  cancelText: { fontSize: 16 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  postBtn: { borderRadius: 20, paddingHorizontal: 20, paddingVertical: 8 },
  postBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  body: { flex: 1, padding: 20 },
  authorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  authorInfo: { marginLeft: 12 },
  name: { fontWeight: '700', fontSize: 15 },
  input: { fontSize: 18, lineHeight: 28, minHeight: 120 },
  imagesRow: { marginTop: 16 },
  imagePreviewContainer: { marginRight: 12, position: 'relative' },
  imagePreview: { width: 120, height: 120, borderRadius: 12 },
  removeImage: { position: 'absolute', top: -8, right: -8 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 0.5,
  },
  toolbarBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toolbarBtnText: { color: '#6C63FF', fontWeight: '500' },
});
