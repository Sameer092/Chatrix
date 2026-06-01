import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useThemeStore } from '../../store/themeStore';

interface HeaderProps {
  title: string;
  subtitle?: string;
  leftIcon?: string;
  rightIcon?: string;
  onLeftPress?: () => void;
  onRightPress?: () => void;
  rightComponent?: React.ReactNode;
  showBack?: boolean;
  transparent?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  leftIcon,
  rightIcon,
  onLeftPress,
  onRightPress,
  rightComponent,
  showBack = false,
  transparent = false,
}) => {
  const isDark = useThemeStore((s) => s.isDark);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const handleBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
  };

  const headerContent = (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <TouchableOpacity
        style={styles.sideButton}
        onPress={showBack ? handleBack : onLeftPress}
        disabled={!showBack && !onLeftPress}
      >
        {showBack ? (
          <Ionicons name="chevron-back" size={24} color={isDark ? '#FFFFFF' : '#1E293B'} />
        ) : leftIcon ? (
          <Ionicons name={leftIcon as any} size={24} color={isDark ? '#FFFFFF' : '#1E293B'} />
        ) : null}
      </TouchableOpacity>

      <View style={styles.center}>
        <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#1E293B' }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.subtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            {subtitle}
          </Text>
        )}
      </View>

      <View style={styles.sideButton}>
        {rightComponent ??
          (rightIcon ? (
            <TouchableOpacity onPress={onRightPress}>
              <Ionicons name={rightIcon as any} size={24} color={isDark ? '#FFFFFF' : '#1E293B'} />
            </TouchableOpacity>
          ) : null)}
      </View>
    </View>
  );

  if (transparent) {
    return (
      <BlurView
        intensity={60}
        tint={isDark ? 'dark' : 'light'}
        style={[styles.blurWrapper, { borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]}
      >
        {headerContent}
      </BlurView>
    );
  }

  return (
    <View
      style={[
        styles.solidWrapper,
        { backgroundColor: isDark ? '#0F0F23' : '#F8F9FA', borderBottomColor: isDark ? '#2D2D6B' : '#E2E8F0' },
      ]}
    >
      {headerContent}
    </View>
  );
};

const styles = StyleSheet.create({
  blurWrapper: {
    borderBottomWidth: 0.5,
  },
  solidWrapper: {
    borderBottomWidth: 0.5,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  sideButton: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 1,
  },
});
