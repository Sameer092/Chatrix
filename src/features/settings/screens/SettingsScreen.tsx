import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';

import { authService } from '../../../services/auth.service';
import { useAuthStore } from '../../../store/authStore';
import { useThemeStore } from '../../../store/themeStore';
import { Avatar } from '../../../components/ui/Avatar';

interface SettingItem {
  icon: string;
  label: string;
  type: 'navigate' | 'toggle' | 'action';
  value?: boolean;
  onPress?: () => void;
  onToggle?: (val: boolean) => void;
  danger?: boolean;
  subtitle?: string;
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const isDark = useThemeStore((s) => s.isDark);
  const { toggleTheme } = useThemeStore();
  const profile = useAuthStore((s) => s.profile);
  const { clearAuth } = useAuthStore();
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await authService.signOut();
            queryClient.clear();
            clearAuth();
          },
        },
      ]
    );
  };

  const settingSections: Array<{ title: string; items: SettingItem[] }> = [
    {
      title: 'Account',
      items: [
        {
          icon: 'person-outline',
          label: 'Edit Profile',
          type: 'navigate',
          onPress: () => navigation.navigate('EditProfile' as never),
        },
        {
          icon: 'people-outline',
          label: 'Friends',
          type: 'navigate',
          onPress: () => navigation.navigate('Friends' as never),
        },
        {
          icon: 'lock-closed-outline',
          label: 'Privacy',
          type: 'navigate',
          subtitle: profile?.is_private ? 'Private account' : 'Public account',
          onPress: () => {},
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: isDark ? 'moon' : 'sunny',
          label: 'Dark Mode',
          type: 'toggle',
          value: isDark,
          onToggle: () => toggleTheme(),
        },
        {
          icon: 'notifications-outline',
          label: 'Notifications',
          type: 'navigate',
          onPress: () => {},
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          icon: 'help-circle-outline',
          label: 'Help & Support',
          type: 'navigate',
          onPress: () => {},
        },
        {
          icon: 'shield-outline',
          label: 'Privacy Policy',
          type: 'navigate',
          onPress: () => {},
        },
        {
          icon: 'document-text-outline',
          label: 'Terms of Service',
          type: 'navigate',
          onPress: () => {},
        },
      ],
    },
    {
      title: '',
      items: [
        {
          icon: 'log-out-outline',
          label: 'Sign Out',
          type: 'action',
          danger: true,
          onPress: handleSignOut,
        },
      ],
    },
  ];

  const bgColor = isDark ? '#0F0F23' : '#F8F9FA';
  const textColor = isDark ? '#FFFFFF' : '#1E293B';
  const subtextColor = isDark ? '#94A3B8' : '#64748B';
  const cardBg = isDark ? '#1A1A3E' : '#FFFFFF';
  const borderColor = isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0';

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: cardBg }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: textColor }]}>Settings</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        {/* Profile Card */}
        <TouchableOpacity
          style={[styles.profileCard, { backgroundColor: cardBg }]}
          onPress={() => navigation.navigate('EditProfile' as never)}
        >
          <Avatar uri={profile?.avatar_url} name={profile?.name ?? ''} size={60} />
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: textColor }]}>{profile?.name}</Text>
            <Text style={[styles.profileUsername, { color: subtextColor }]}>@{profile?.username}</Text>
            <Text style={styles.editProfileLink}>Edit Profile &rarr;</Text>
          </View>
        </TouchableOpacity>

        {settingSections.map((section, si) => (
          <View key={si} style={styles.section}>
            {section.title ? (
              <Text style={[styles.sectionTitle, { color: subtextColor }]}>{section.title.toUpperCase()}</Text>
            ) : null}
            <View style={[styles.sectionCard, { backgroundColor: cardBg }]}>
              {section.items.map((item, ii) => (
                <TouchableOpacity
                  key={ii}
                  style={[
                    styles.settingRow,
                    { borderBottomColor: borderColor },
                    ii < section.items.length - 1 && { borderBottomWidth: 0.5 },
                  ]}
                  onPress={item.type !== 'toggle' ? item.onPress : undefined}
                  activeOpacity={item.type === 'toggle' ? 1 : 0.7}
                >
                  <View style={[styles.iconBox, { backgroundColor: item.danger ? 'rgba(239,68,68,0.1)' : 'rgba(108,99,255,0.1)' }]}>
                    <Ionicons
                      name={item.icon as any}
                      size={20}
                      color={item.danger ? '#EF4444' : '#6C63FF'}
                    />
                  </View>
                  <View style={styles.settingInfo}>
                    <Text style={[styles.settingLabel, { color: item.danger ? '#EF4444' : textColor }]}>
                      {item.label}
                    </Text>
                    {item.subtitle && (
                      <Text style={[styles.settingSubtitle, { color: subtextColor }]}>
                        {item.subtitle}
                      </Text>
                    )}
                  </View>
                  {item.type === 'toggle' ? (
                    <Switch
                      value={item.value}
                      onValueChange={item.onToggle}
                      trackColor={{ false: '#2D2D6B', true: '#6C63FF' }}
                      thumbColor="#FFFFFF"
                    />
                  ) : item.type === 'navigate' ? (
                    <Ionicons name="chevron-forward" size={18} color={subtextColor} />
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <Text style={[styles.version, { color: subtextColor }]}>Chatrix v1.0.0</Text>
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
  title: { fontSize: 17, fontWeight: '700' },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 16,
    borderRadius: 20,
    gap: 16,
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: '700' },
  profileUsername: { fontSize: 13, marginTop: 2 },
  editProfileLink: { color: '#6C63FF', fontSize: 13, fontWeight: '600', marginTop: 6 },
  section: { marginBottom: 8 },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1, paddingHorizontal: 20, paddingBottom: 8 },
  sectionCard: { marginHorizontal: 16, borderRadius: 16, overflow: 'hidden' },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingInfo: { flex: 1 },
  settingLabel: { fontSize: 15, fontWeight: '500' },
  settingSubtitle: { fontSize: 12, marginTop: 2 },
  version: { textAlign: 'center', fontSize: 12, padding: 24 },
});
