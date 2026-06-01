import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface GradientBackgroundProps {
  children: React.ReactNode;
  colors?: string[];
  style?: ViewStyle;
  start?: { x: number; y: number };
  end?: { x: number; y: number };
}

export const GradientBackground: React.FC<GradientBackgroundProps> = ({
  children,
  colors = ['#0F0F23', '#1A1A3E'],
  style,
  start = { x: 0, y: 0 },
  end = { x: 0, y: 1 },
}) => (
  <LinearGradient colors={colors as [string, string]} style={[styles.container, style]} start={start} end={end}>
    {children}
  </LinearGradient>
);

const styles = StyleSheet.create({ container: { flex: 1 } });
