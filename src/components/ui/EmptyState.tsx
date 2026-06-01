import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/themeStore';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: string;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'cube-outline',
  title,
  message,
  actionLabel,
  onAction,
}) => {
  const isDark = useThemeStore((s) => s.isDark);

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: isDark ? '#1A1A3E' : '#F1F5F9' }]}>
        <Ionicons name={icon as any} size={48} color="#6C63FF" />
      </View>
      <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#1E293B' }]}>{title}</Text>
      {message && (
        <Text style={[styles.message, { color: isDark ? '#94A3B8' : '#64748B' }]}>{message}</Text>
      )}
      {actionLabel && onAction && (
        <Button
          title={actionLabel}
          onPress={onAction}
          gradient
          size="md"
          style={{ marginTop: 20, alignSelf: 'center', minWidth: 160 }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
