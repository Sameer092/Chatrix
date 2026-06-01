import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { groupService } from '../../../services/group.service';
import { storageService } from '../../../services/storage.service';
import { useAuthStore } from '../../../store/authStore';
import { useThemeStore } from '../../../store/themeStore';
import { Avatar } from '../../../components/ui/Avatar';
import { Button } from '../../../components/ui/Button';
import type { RootRouteProp, RootNavProp } from '../../../types/navigation.types';
import type { GroupMember } from '../../../types';

export default function GroupInfoScreen() {
  const route = useRoute<RootRouteProp<'GroupInfo'>>();
  const navigation = useNavigation<RootNavProp>();
  const insets = useSafeAreaInsets();
  const isDark = useThemeStore((s) => s.isDark);
  const currentUser = useAuthStore((s) => s.user);
  const { groupId } = route.params;
  const queryClient = useQueryClient();

  const { data: group, isLoading } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => groupService.getGroup(groupId, currentUser!.id),
    enabled: !!currentUser?.id,
  });

  const { data: members } = useQuery({
    queryKey: ['groupMembers', groupId],
    queryFn: () => groupService.getGroupMembers(groupId),
  });

  const isAdmin = group?.my_role === 'admin';

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  useEffect(() => {
    if (group) {
      setName(group.name);
      setDescription(group.description ?? '');
    }
  }, [group]);

  const { mutate: saveGroup, isPending: saving } = useMutation({
    mutationFn: async () => {
      const updates: Record<string, string | null> = {
        name: name.trim(),
        description: description.trim() || null,
      };
      if (avatarUri) {
        updates.avatar_url = await storageService.uploadGroupAvatar(groupId, avatarUri);
      }
      return groupService.updateGroup(groupId, updates);
    },
    onSuccess: () => {
      setEditing(false);
      setAvatarUri(null);
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups', currentUser?.id] });
    },
    onError: () => Alert.alert('Error', 'Could not update the group.'),
  });

  const { mutate: leaveGroup } = useMutation({
    mutationFn: () => groupService.leaveGroup(groupId, currentUser!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', currentUser?.id] });
      navigation.navigate('Main');
    },
  });

  const { mutate: removeMember } = useMutation({
    mutationFn: (memberId: string) => groupService.removeMember(groupId, memberId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groupMembers', groupId] }),
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

  const bgColor = isDark ? '#0F0F23' : '#F8F9FA';
  const cardBg = isDark ? '#1A1A3E' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#1E293B';
  const subtextColor = isDark ? '#94A3B8' : '#64748B';
  const inputBg = isDark ? '#252550' : '#F1F5F9';
  const borderColor = isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0';

  const renderMember = (member: GroupMember) => {
    const p = member.profile;
    const isSelf = p?.id === currentUser?.id;
    return (
      <View key={member.id} style={[styles.memberRow, { borderBottomColor: borderColor }]}>
        <Avatar
          uri={p?.avatar_url}
          name={p?.name ?? ''}
          size={44}
          isOnline={p?.is_online}
          onPress={() => p?.id && !isSelf && navigation.navigate('UserProfile', { userId: p.id })}
        />
        <View style={styles.memberInfo}>
          <Text style={[styles.memberName, { color: textColor }]}>
            {p?.name}{isSelf ? ' (You)' : ''}
          </Text>
          <Text style={[styles.memberUsername, { color: subtextColor }]}>@{p?.username}</Text>
        </View>
        {member.role === 'admin' && (
          <View style={styles.adminBadge}>
            <Text style={styles.adminText}>Admin</Text>
          </View>
        )}
        {isAdmin && !isSelf && member.role !== 'admin' && (
          <TouchableOpacity
            onPress={() =>
              Alert.alert('Remove member', `Remove ${p?.name} from the group?`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', style: 'destructive', onPress: () => p?.id && removeMember(p.id) },
              ])
            }
            style={{ marginLeft: 8 }}
          >
            <Ionicons name="remove-circle-outline" size={22} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: bgColor }]}>
        <ActivityIndicator color="#6C63FF" size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: cardBg, borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={26} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>Group Info</Text>
        {isAdmin ? (
          <TouchableOpacity
            onPress={() => (editing ? saveGroup() : setEditing(true))}
            disabled={saving}
          >
            <Text style={[styles.editAction, { opacity: saving ? 0.5 : 1 }]}>
              {editing ? (saving ? 'Saving...' : 'Save') : 'Edit'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        {/* Avatar + name */}
        <View style={styles.topSection}>
          <TouchableOpacity disabled={!editing} onPress={pickAvatar} style={styles.avatarContainer}>
            {avatarUri || group?.avatar_url ? (
              <Image
                source={{ uri: avatarUri ?? group?.avatar_url ?? undefined }}
                style={styles.groupAvatar}
                contentFit="cover"
              />
            ) : (
              <LinearGradient colors={['#6C63FF', '#FF6584']} style={styles.groupAvatar}>
                <Text style={styles.groupAvatarLetter}>{group?.name?.[0]?.toUpperCase() ?? 'G'}</Text>
              </LinearGradient>
            )}
            {editing && (
              <View style={styles.avatarEdit}>
                <Ionicons name="camera" size={16} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>

          {editing ? (
            <TextInput
              style={[styles.nameInput, { color: textColor, backgroundColor: inputBg }]}
              value={name}
              onChangeText={setName}
              placeholder="Group name"
              placeholderTextColor={subtextColor}
              maxLength={50}
            />
          ) : (
            <Text style={[styles.groupName, { color: textColor }]}>{group?.name}</Text>
          )}
          <Text style={[styles.memberCount, { color: subtextColor }]}>
            {group?.member_count ?? members?.length ?? 0} members
          </Text>
        </View>

        {/* Description */}
        <Text style={[styles.sectionLabel, { color: subtextColor }]}>DESCRIPTION</Text>
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          {editing ? (
            <TextInput
              style={[styles.descInput, { color: textColor }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Add a group description..."
              placeholderTextColor={subtextColor}
              multiline
              maxLength={200}
            />
          ) : (
            <Text style={[styles.descText, { color: group?.description ? textColor : subtextColor }]}>
              {group?.description || 'No description'}
            </Text>
          )}
        </View>

        {/* Members */}
        <Text style={[styles.sectionLabel, { color: subtextColor }]}>
          MEMBERS ({members?.length ?? 0})
        </Text>
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          {(members ?? []).map(renderMember)}
        </View>

        {/* Leave */}
        <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
          <Button
            title="Leave Group"
            variant="danger"
            onPress={() =>
              Alert.alert('Leave Group', `Leave "${group?.name}"?`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Leave', style: 'destructive', onPress: () => leaveGroup() },
              ])
            }
            leftIcon={<Ionicons name="exit-outline" size={18} color="#FFFFFF" />}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
  },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  editAction: { color: '#6C63FF', fontSize: 16, fontWeight: '700' },
  topSection: { alignItems: 'center', paddingVertical: 24 },
  avatarContainer: { position: 'relative' },
  groupAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupAvatarLetter: { color: '#FFFFFF', fontSize: 40, fontWeight: '800' },
  avatarEdit: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#6C63FF',
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0F0F23',
  },
  groupName: { fontSize: 22, fontWeight: '800', marginTop: 14 },
  nameInput: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 220,
    textAlign: 'center',
  },
  memberCount: { fontSize: 14, marginTop: 6 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  card: { marginHorizontal: 16, borderRadius: 16, overflow: 'hidden', paddingHorizontal: 16 },
  descInput: { fontSize: 15, paddingVertical: 14, minHeight: 60 },
  descText: { fontSize: 15, paddingVertical: 14, lineHeight: 21 },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    gap: 14,
  },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 16, fontWeight: '600' },
  memberUsername: { fontSize: 13, marginTop: 2 },
  adminBadge: {
    backgroundColor: 'rgba(108,99,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6C63FF',
  },
  adminText: { color: '#6C63FF', fontSize: 11, fontWeight: '700' },
});
