import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation, useQuery } from '@tanstack/react-query';

import { groupService } from '../../../services/group.service';
import { friendService } from '../../../services/friend.service';
import { storageService } from '../../../services/storage.service';
import { useAuthStore } from '../../../store/authStore';
import { useThemeStore } from '../../../store/themeStore';
import { Avatar } from '../../../components/ui/Avatar';
import type { Profile } from '../../../types';

export default function CreateGroupScreen() {
  const insets = useSafeAreaInsets();
  const isDark = useThemeStore((s) => s.isDark);
  const user = useAuthStore((s) => s.user);
  const navigation = useNavigation();

  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const { data: friends } = useQuery({
    queryKey: ['friends', user?.id],
    queryFn: () => friendService.getFriends(user!.id),
    enabled: !!user?.id,
  });

  const { mutate: createGroup, isPending } = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      let avatarUrl: string | undefined;
      if (avatarUri) {
        const tempGroupId = `group_${Date.now()}`;
        avatarUrl = await storageService.uploadGroupAvatar(tempGroupId, avatarUri);
      }
      return groupService.createGroup({
        name: groupName.trim(),
        description: description.trim() || undefined,
        avatarUrl,
        memberIds: selectedMembers,
        createdBy: user.id,
      });
    },
    onSuccess: (group) => {
      if (group) {
        navigation.goBack();
      }
    },
    onError: () => Alert.alert('Error', 'Failed to create group. Please try again.'),
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

  const toggleMember = (userId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const bgColor = isDark ? '#0F0F23' : '#F8F9FA';
  const textColor = isDark ? '#FFFFFF' : '#1E293B';
  const cardBg = isDark ? '#1A1A3E' : '#FFFFFF';
  const subtextColor = isDark ? '#94A3B8' : '#64748B';
  const inputBg = isDark ? '#252550' : '#F1F5F9';

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: cardBg }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>New Group</Text>
        <TouchableOpacity
          onPress={() => { if (groupName.trim() && selectedMembers.length >= 1) createGroup(); }}
          disabled={!groupName.trim() || selectedMembers.length < 1 || isPending}
        >
          <Text style={[styles.createBtn, { opacity: !groupName.trim() || selectedMembers.length < 1 ? 0.5 : 1 }]}>
            {isPending ? 'Creating...' : 'Create'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={pickAvatar} style={styles.avatarContainer}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.groupAvatar} contentFit="cover" />
            ) : (
              <LinearGradient colors={['#6C63FF', '#FF6584']} style={styles.groupAvatar}>
                <Ionicons name="camera" size={32} color="#FFFFFF" />
              </LinearGradient>
            )}
            <View style={styles.avatarOverlay}>
              <Ionicons name="camera" size={18} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Group Name */}
        <View style={[styles.section, { backgroundColor: cardBg }]}>
          <TextInput
            style={[styles.nameInput, { color: textColor, borderBottomColor: isDark ? '#2D2D6B' : '#E2E8F0' }]}
            placeholder="Group Name"
            placeholderTextColor={subtextColor}
            value={groupName}
            onChangeText={setGroupName}
            maxLength={50}
          />
          <TextInput
            style={[styles.descInput, { color: textColor }]}
            placeholder="Group description (optional)"
            placeholderTextColor={subtextColor}
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={200}
          />
        </View>

        {/* Members */}
        <Text style={[styles.sectionLabel, { color: subtextColor }]}>
          ADD MEMBERS ({selectedMembers.length} selected)
        </Text>
        <View style={[styles.section, { backgroundColor: cardBg }]}>
          {(friends ?? []).map((friendship) => {
            const friend = friendship.friend as Profile | undefined;
            if (!friend) return null;
            const isSelected = selectedMembers.includes(friend.id);
            return (
              <TouchableOpacity
                key={friend.id}
                style={styles.friendRow}
                onPress={() => toggleMember(friend.id)}
              >
                <Avatar uri={friend.avatar_url} name={friend.name} size={44} />
                <View style={styles.friendInfo}>
                  <Text style={[styles.friendName, { color: textColor }]}>{friend.name}</Text>
                  <Text style={[styles.friendUsername, { color: subtextColor }]}>
                    @{friend.username}
                  </Text>
                </View>
                <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                  {isSelected && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                </View>
              </TouchableOpacity>
            );
          })}
          {(friends ?? []).length === 0 && (
            <Text style={[styles.noFriends, { color: subtextColor }]}>
              Add friends first to create a group with them
            </Text>
          )}
        </View>
      </ScrollView>
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
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  createBtn: { color: '#6C63FF', fontSize: 16, fontWeight: '700' },
  avatarSection: { alignItems: 'center', paddingVertical: 24 },
  avatarContainer: { position: 'relative' },
  groupAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#6C63FF',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0F0F23',
  },
  section: { marginBottom: 24, paddingHorizontal: 20 },
  nameInput: {
    fontSize: 18,
    fontWeight: '600',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  descInput: { fontSize: 15, paddingVertical: 14, minHeight: 60 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    gap: 14,
  },
  friendInfo: { flex: 1 },
  friendName: { fontSize: 16, fontWeight: '600' },
  friendUsername: { fontSize: 13, marginTop: 2 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2D2D6B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: { backgroundColor: '#6C63FF', borderColor: '#6C63FF' },
  noFriends: { fontSize: 14, textAlign: 'center', paddingVertical: 24 },
});
