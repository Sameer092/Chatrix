import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';

import { profileService } from '../../../services/profile.service';
import { storageService } from '../../../services/storage.service';
import { useAuthStore } from '../../../store/authStore';
import { useThemeStore } from '../../../store/themeStore';
import { Avatar } from '../../../components/ui/Avatar';
import { Button } from '../../../components/ui/Button';

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const isDark = useThemeStore((s) => s.isDark);
  const { profile, updateProfile } = useAuthStore();
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const [name, setName] = useState(profile?.name ?? '');
  const [username, setUsername] = useState(profile?.username ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [coverUri, setCoverUri] = useState<string | null>(null);

  const { mutate: saveProfile, isPending } = useMutation({
    mutationFn: async () => {
      if (!profile?.id) return;
      const updates: Record<string, string | null> = { name, username: username.toLowerCase(), bio };
      if (avatarUri) {
        updates.avatar_url = await storageService.uploadAvatar(profile.id, avatarUri);
      }
      if (coverUri) {
        updates.cover_url = await storageService.uploadCover(profile.id, coverUri);
      }
      return profileService.updateProfile(profile.id, updates);
    },
    onSuccess: (updated) => {
      if (updated) {
        updateProfile(updated);
        queryClient.invalidateQueries({ queryKey: ['profile', profile?.id] });
      }
      navigation.goBack();
    },
    onError: () => Alert.alert('Error', 'Failed to update profile. Please try again.'),
  });

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled) setAvatarUri(result.assets[0].uri);
  };

  const pickCover = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [16, 9],
    });
    if (!result.canceled) setCoverUri(result.assets[0].uri);
  };

  const bgColor = isDark ? '#0F0F23' : '#F8F9FA';
  const textColor = isDark ? '#FFFFFF' : '#1E293B';
  const cardBg = isDark ? '#1A1A3E' : '#FFFFFF';
  const subtextColor = isDark ? '#94A3B8' : '#64748B';
  const inputBg = isDark ? '#252550' : '#F1F5F9';

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: bgColor }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: cardBg }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>Edit Profile</Text>
        <TouchableOpacity onPress={() => saveProfile()} disabled={isPending}>
          <Text style={[styles.saveBtn, { opacity: isPending ? 0.5 : 1 }]}>
            {isPending ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Cover Photo */}
        <TouchableOpacity onPress={pickCover} style={styles.coverContainer}>
          {coverUri ? (
            <Image source={{ uri: coverUri }} style={styles.cover} contentFit="cover" />
          ) : profile?.cover_url ? (
            <Image source={{ uri: profile.cover_url }} style={styles.cover} contentFit="cover" />
          ) : (
            <LinearGradient colors={['#1A1A3E', '#252550']} style={styles.cover} />
          )}
          <View style={styles.coverEditOverlay}>
            <Ionicons name="camera" size={24} color="#FFFFFF" />
            <Text style={styles.coverEditText}>Change Cover</Text>
          </View>
        </TouchableOpacity>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={pickAvatar} style={styles.avatarContainer}>
            <Avatar
              uri={avatarUri ?? profile?.avatar_url}
              name={profile?.name ?? ''}
              size={88}
              borderColor="#6C63FF"
              borderWidth={3}
            />
            <View style={styles.avatarEditOverlay}>
              <Ionicons name="camera" size={14} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Fields */}
        <View style={[styles.fieldsSection, { backgroundColor: cardBg }]}>
          {[
            { label: 'Full Name', value: name, onChange: setName, placeholder: 'Your name', maxLength: 50 },
            { label: 'Username', value: username, onChange: (t: string) => setUsername(t.toLowerCase()), placeholder: 'username', maxLength: 30 },
          ].map((field) => (
            <View key={field.label} style={[styles.fieldRow, { borderBottomColor: isDark ? '#2D2D6B' : '#E2E8F0' }]}>
              <Text style={[styles.fieldLabel, { color: subtextColor }]}>{field.label}</Text>
              <TextInput
                style={[styles.fieldInput, { color: textColor }]}
                value={field.value}
                onChangeText={field.onChange}
                placeholder={field.placeholder}
                placeholderTextColor={subtextColor}
                maxLength={field.maxLength}
              />
            </View>
          ))}
          <View style={styles.fieldRow}>
            <Text style={[styles.fieldLabel, { color: subtextColor }]}>Bio</Text>
            <TextInput
              style={[styles.fieldInput, { color: textColor }]}
              value={bio}
              onChangeText={setBio}
              placeholder="Write something about yourself..."
              placeholderTextColor={subtextColor}
              multiline
              maxLength={160}
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

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
  headerTitle: { fontSize: 17, fontWeight: '700' },
  saveBtn: { color: '#6C63FF', fontSize: 16, fontWeight: '700' },
  coverContainer: { height: 160, position: 'relative' },
  cover: { width: '100%', height: 160 },
  coverEditOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  coverEditText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  avatarSection: { alignItems: 'center', marginTop: -44, marginBottom: 16 },
  avatarContainer: { position: 'relative' },
  avatarEditOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#6C63FF',
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0F0F23',
  },
  fieldsSection: { marginHorizontal: 16, borderRadius: 16, overflow: 'hidden', paddingHorizontal: 16 },
  fieldRow: {
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    gap: 6,
  },
  fieldLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldInput: { fontSize: 16, paddingVertical: 2 },
});
