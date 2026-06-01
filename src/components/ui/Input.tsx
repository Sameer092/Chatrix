import React, { useState, forwardRef } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useThemeStore } from '../../store/themeStore';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  hint?: string;
}

const AnimatedView = Animated.createAnimatedComponent(View);

export const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, leftIcon, rightIcon, onRightIconPress, hint, style, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const [isSecure, setIsSecure] = useState(props.secureTextEntry ?? false);
    const isDark = useThemeStore((s) => s.isDark);

    const borderColor = useSharedValue(isDark ? '#2D2D6B' : '#E2E8F0');

    const animatedBorder = useAnimatedStyle(() => ({
      borderColor: borderColor.value,
    }));

    const handleFocus = (e: any) => {
      setIsFocused(true);
      borderColor.value = withTiming('#6C63FF', { duration: 200 });
      props.onFocus?.(e);
    };

    const handleBlur = (e: any) => {
      setIsFocused(false);
      borderColor.value = withTiming(
        error ? '#EF4444' : isDark ? '#2D2D6B' : '#E2E8F0',
        { duration: 200 }
      );
      props.onBlur?.(e);
    };

    const bgColor = isDark ? '#1E1E42' : '#F1F5F9';
    const textColor = isDark ? '#FFFFFF' : '#1E293B';
    const placeholderColor = isDark ? '#64748B' : '#94A3B8';
    const iconColor = isFocused ? '#6C63FF' : isDark ? '#64748B' : '#94A3B8';

    return (
      <View style={styles.container}>
        {label && (
          <Text style={[styles.label, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            {label}
          </Text>
        )}
        <AnimatedView
          style={[
            styles.inputWrapper,
            { backgroundColor: bgColor, borderColor: error ? '#EF4444' : undefined },
            animatedBorder,
          ]}
        >
          {leftIcon && (
            <Ionicons name={leftIcon as any} size={20} color={iconColor} style={styles.leftIcon} />
          )}
          <TextInput
            ref={ref}
            style={[
              styles.input,
              { color: textColor, flex: 1 },
              style,
            ]}
            placeholderTextColor={placeholderColor}
            onFocus={handleFocus}
            onBlur={handleBlur}
            secureTextEntry={isSecure}
            {...props}
          />
          {props.secureTextEntry && (
            <TouchableOpacity
              onPress={() => setIsSecure(!isSecure)}
              style={styles.rightIcon}
            >
              <Ionicons
                name={isSecure ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={iconColor}
              />
            </TouchableOpacity>
          )}
          {rightIcon && !props.secureTextEntry && (
            <TouchableOpacity onPress={onRightIconPress} style={styles.rightIcon}>
              <Ionicons name={rightIcon as any} size={20} color={iconColor} />
            </TouchableOpacity>
          )}
        </AnimatedView>
        {error && <Text style={styles.error}>{error}</Text>}
        {hint && !error && (
          <Text style={[styles.hint, { color: isDark ? '#64748B' : '#94A3B8' }]}>{hint}</Text>
        )}
      </View>
    );
  }
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '500', marginBottom: 6, marginLeft: 4 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    height: 52,
  },
  input: {
    fontSize: 15,
    paddingVertical: 0,
  },
  leftIcon: { marginRight: 10 },
  rightIcon: { marginLeft: 8, padding: 4 },
  error: { color: '#EF4444', fontSize: 12, marginTop: 4, marginLeft: 4 },
  hint: { fontSize: 12, marginTop: 4, marginLeft: 4 },
});
