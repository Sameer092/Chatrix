import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useThemeStore } from '../../store/themeStore';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  borderRadius = 8,
  style,
}) => {
  const isDark = useThemeStore((s) => s.isDark);
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 800 }),
        withTiming(1, { duration: 800 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: isDark ? '#252550' : '#E2E8F0',
        },
        animatedStyle,
        style,
      ]}
    />
  );
};

export const PostSkeleton: React.FC = () => {
  const isDark = useThemeStore((s) => s.isDark);
  return (
    <View style={[styles.postSkeleton, { backgroundColor: isDark ? '#1A1A3E' : '#FFFFFF' }]}>
      <View style={styles.skeletonHeader}>
        <Skeleton width={44} height={44} borderRadius={22} />
        <View style={styles.skeletonHeaderText}>
          <Skeleton width={120} height={14} borderRadius={7} />
          <Skeleton width={80} height={11} borderRadius={5} style={{ marginTop: 6 }} />
        </View>
      </View>
      <Skeleton width="100%" height={14} borderRadius={7} style={{ marginTop: 16 }} />
      <Skeleton width="80%" height={14} borderRadius={7} style={{ marginTop: 8 }} />
      <Skeleton width="100%" height={200} borderRadius={12} style={{ marginTop: 14 }} />
      <View style={styles.skeletonActions}>
        <Skeleton width={60} height={14} borderRadius={7} />
        <Skeleton width={60} height={14} borderRadius={7} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  postSkeleton: {
    padding: 16,
    marginBottom: 8,
    borderRadius: 16,
    marginHorizontal: 16,
  },
  skeletonHeader: { flexDirection: 'row', alignItems: 'center' },
  skeletonHeaderText: { marginLeft: 12, flex: 1 },
  skeletonActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 12,
  },
});
