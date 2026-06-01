import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { useThemeStore } from '../../../store/themeStore';

export const TypingIndicator: React.FC = () => {
  const isDark = useThemeStore((s) => s.isDark);

  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  useEffect(() => {
    const animate = (val: Animated.SharedValue<number>, delay: number) => {
      val.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(-6, { duration: 300 }),
            withTiming(0, { duration: 300 })
          ),
          -1
        )
      );
    };
    animate(dot1, 0);
    animate(dot2, 150);
    animate(dot3, 300);
  }, []);

  const dotStyle = (val: Animated.SharedValue<number>) =>
    useAnimatedStyle(() => ({ transform: [{ translateY: val.value }] }));

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#1A1A3E' : '#FFFFFF' }]}>
      <View style={[styles.bubble, { backgroundColor: isDark ? '#252550' : '#F1F5F9' }]}>
        <Animated.View style={[styles.dot, dotStyle(dot1), { backgroundColor: '#6C63FF' }]} />
        <Animated.View style={[styles.dot, dotStyle(dot2), { backgroundColor: '#6C63FF', opacity: 0.7 }]} />
        <Animated.View style={[styles.dot, dotStyle(dot3), { backgroundColor: '#6C63FF', opacity: 0.4 }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingBottom: 4 },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    gap: 5,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
