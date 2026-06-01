import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  View,
  StyleSheet,
  TouchableOpacityProps,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  gradient?: boolean;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  gradient = false,
  disabled,
  onPress,
  style,
  ...props
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handlePress = (e: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.(e);
  };

  const sizes = {
    sm: { paddingVertical: 8, paddingHorizontal: 16, fontSize: 13, height: 36 },
    md: { paddingVertical: 12, paddingHorizontal: 24, fontSize: 15, height: 48 },
    lg: { paddingVertical: 16, paddingHorizontal: 32, fontSize: 17, height: 56 },
  };

  const variants: Record<Variant, object> = {
    primary: { backgroundColor: '#6C63FF' },
    secondary: { backgroundColor: '#1A1A3E' },
    outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#6C63FF' },
    ghost: { backgroundColor: 'transparent' },
    danger: { backgroundColor: '#EF4444' },
  };

  const textColors: Record<Variant, string> = {
    primary: '#FFFFFF',
    secondary: '#FFFFFF',
    outline: '#6C63FF',
    ghost: '#6C63FF',
    danger: '#FFFFFF',
  };

  const { height, paddingVertical, paddingHorizontal, fontSize } = sizes[size];
  const variantStyle = variants[variant];
  const textColor = textColors[variant];

  const content = (
    <View style={styles.row}>
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <>
          {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
          <Text style={[styles.text, { color: textColor, fontSize }]}>{title}</Text>
          {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
        </>
      )}
    </View>
  );

  return (
    <AnimatedTouchable
      style={[animatedStyle, style]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={1}
      {...props}
    >
      {gradient && variant === 'primary' ? (
        <LinearGradient
          colors={['#6C63FF', '#FF6584']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.base,
            { height, paddingVertical, paddingHorizontal, borderRadius: height / 2 },
            disabled && styles.disabled,
          ]}
        >
          {content}
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.base,
            variantStyle,
            { height, paddingVertical, paddingHorizontal, borderRadius: height / 2 },
            disabled && styles.disabled,
          ]}
        >
          {content}
        </View>
      )}
    </AnimatedTouchable>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  iconLeft: { marginRight: 8 },
  iconRight: { marginLeft: 8 },
  disabled: { opacity: 0.5 },
});
