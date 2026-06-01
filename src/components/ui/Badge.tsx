import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface BadgeProps {
  count?: number;
  color?: string;
  textColor?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  count = 0,
  color = '#EF4444',
  textColor = '#FFFFFF',
  size = 'md',
}) => {
  if (count <= 0) return null;
  const label = count > 99 ? '99+' : String(count);
  const dim = size === 'sm' ? 16 : 20;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: color,
          minWidth: dim,
          height: dim,
          borderRadius: dim / 2,
          paddingHorizontal: count > 9 ? 5 : 0,
        },
      ]}
    >
      <Text style={[styles.text, { color: textColor, fontSize: size === 'sm' ? 10 : 12 }]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '700',
  },
});
