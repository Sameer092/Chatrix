import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';

interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: number;
  isOnline?: boolean;
  onPress?: () => void;
  borderColor?: string;
  borderWidth?: number;
}

export const Avatar: React.FC<AvatarProps> = ({
  uri,
  name = '',
  size = 40,
  isOnline,
  onPress,
  borderColor,
  borderWidth = 0,
}) => {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const colors = ['#6C63FF', '#FF6584', '#00D4FF', '#22C55E', '#F59E0B', '#EF4444'];
  const colorIndex = name.charCodeAt(0) % colors.length;
  const bgColor = colors[colorIndex] ?? '#6C63FF';

  const Container: React.ComponentType<any> = onPress ? TouchableOpacity : View;

  return (
    <Container onPress={onPress} activeOpacity={onPress ? 0.8 : undefined}>
      <View
        style={[
          styles.container,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: borderColor,
            borderWidth,
          },
        ]}
      >
        {uri ? (
          <Image
            source={{ uri }}
            style={{ width: size, height: size, borderRadius: size / 2 }}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={200}
          />
        ) : (
          <View
            style={[
              styles.placeholder,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: bgColor,
              },
            ]}
          >
            <Text style={[styles.initials, { fontSize: size * 0.35 }]}>{initials}</Text>
          </View>
        )}
      </View>
      {isOnline !== undefined && (
        <View
          style={[
            styles.onlineIndicator,
            {
              width: size * 0.28,
              height: size * 0.28,
              borderRadius: size * 0.14,
              backgroundColor: isOnline ? '#22C55E' : '#64748B',
              bottom: 0,
              right: 0,
            },
          ]}
        />
      )}
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  onlineIndicator: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#0F0F23',
  },
});
