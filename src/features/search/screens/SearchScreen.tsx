import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { profileService } from '../../../services/profile.service';
import { useThemeStore } from '../../../store/themeStore';
import { useDebounce } from '../../../hooks/useDebounce';
import { Avatar } from '../../../components/ui/Avatar';
import { EmptyState } from '../../../components/ui/EmptyState';
import type { Profile } from '../../../types';
import type { RootNavProp } from '../../../types/navigation.types';

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const isDark = useThemeStore((s) => s.isDark);
  const navigation = useNavigation<RootNavProp>();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 400);

  const { data: results, isLoading } = useQuery({
    queryKey: ['searchUsers', debouncedQuery],
    queryFn: () => profileService.searchUsers(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
  });

  const bgColor = isDark ? '#0F0F23' : '#F8F9FA';
  const textColor = isDark ? '#FFFFFF' : '#1E293B';
  const subtextColor = isDark ? '#94A3B8' : '#64748B';
  const inputBg = isDark ? '#1A1A3E' : '#FFFFFF';
  const borderColor = isDark ? '#2D2D6B' : '#E2E8F0';

  const renderUser = ({ item }: { item: Profile }) => (
    <TouchableOpacity
      style={[styles.userRow, { borderBottomColor: borderColor }]}
      onPress={() => navigation.navigate('UserProfile', { userId: item.id })}
      activeOpacity={0.7}
    >
      <Avatar uri={item.avatar_url} name={item.name} size={50} isOnline={item.is_online} />
      <View style={styles.userInfo}>
        <Text style={[styles.name, { color: textColor }]}>{item.name}</Text>
        <Text style={[styles.username, { color: subtextColor }]}>@{item.username}</Text>
        {item.bio ? (
          <Text style={[styles.bio, { color: subtextColor }]} numberOfLines={1}>
            {item.bio}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={subtextColor} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Search Bar */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={textColor} />
        </TouchableOpacity>
        <View style={[styles.searchBar, { backgroundColor: inputBg, borderColor }]}>
          <Ionicons name="search-outline" size={18} color={subtextColor} />
          <TextInput
            style={[styles.searchInput, { color: textColor }]}
            placeholder="Search by name or username..."
            placeholderTextColor={subtextColor}
            value={query}
            onChangeText={setQuery}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color={subtextColor} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Results */}
      {isLoading && debouncedQuery.length >= 2 ? (
        <View style={styles.loading}>
          <ActivityIndicator color="#6C63FF" size="large" />
        </View>
      ) : (
        <FlatList
          data={results ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderUser}
          ListEmptyComponent={
            debouncedQuery.length >= 2 ? (
              <EmptyState
                icon="search-outline"
                title="No users found"
                message={`No results for "${debouncedQuery}"`}
              />
            ) : (
              <View style={styles.hintContainer}>
                <Ionicons name="people-outline" size={48} color={subtextColor} style={{ marginBottom: 12 }} />
                <Text style={[styles.hintText, { color: subtextColor }]}>
                  Search for people by their name or username
                </Text>
              </View>
            )
          }
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  backBtn: { padding: 4 },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 15 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { flexGrow: 1 },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    gap: 14,
  },
  userInfo: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700' },
  username: { fontSize: 13, marginTop: 2 },
  bio: { fontSize: 12, marginTop: 3 },
  hintContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 80 },
  hintText: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
});
