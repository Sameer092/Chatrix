import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { formatDuration } from '../../../utils/formatters';
import { useThemeStore } from '../../../store/themeStore';

interface VoiceRecorderProps {
  onSend: (uri: string, duration: number) => void;
  onCancel: () => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onSend, onCancel }) => {
  const isDark = useThemeStore((s) => s.isDark);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [duration, setDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    startRecording();
    return () => {
      clearInterval(timerRef.current);
      recording?.stopAndUnloadAsync();
      // Always leave record mode so later playback routes to the speaker.
      Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true }).catch(() => {});
    };
  }, []);

  const startRecording = async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        onCancel();
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(rec);
      setIsRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);

      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 500 }),
          withTiming(1, { duration: 500 })
        ),
        -1
      );
    } catch (err) {
      onCancel();
    }
  };

  const stopAndSend = async () => {
    if (!recording) return;
    clearInterval(timerRef.current);
    try {
      await recording.stopAndUnloadAsync();
      // Reset the audio session out of record mode so playback isn't silent.
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
      const uri = recording.getURI();
      if (uri) {
        onSend(uri, duration);
      }
    } catch {
      onCancel();
    }
  };

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#1A1A3E' : '#FFFFFF', borderTopColor: isDark ? '#2D2D6B' : '#E2E8F0' }]}>
      <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
        <Ionicons name="trash-outline" size={24} color="#EF4444" />
      </TouchableOpacity>

      <View style={styles.center}>
        <Animated.View style={[styles.pulse, pulseStyle]}>
          <LinearGradient colors={['#EF4444', '#FF6584']} style={styles.recordDot}>
            <Ionicons name="mic" size={20} color="#FFFFFF" />
          </LinearGradient>
        </Animated.View>
        <Text style={[styles.duration, { color: isDark ? '#FFFFFF' : '#1E293B' }]}>
          {formatDuration(duration)}
        </Text>
        <Text style={{ color: '#94A3B8', fontSize: 12 }}>Recording...</Text>
      </View>

      <TouchableOpacity onPress={stopAndSend}>
        <LinearGradient colors={['#6C63FF', '#FF6584']} style={styles.sendBtn}>
          <Ionicons name="send" size={20} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
    borderTopWidth: 0.5,
  },
  cancelBtn: { padding: 8 },
  center: { alignItems: 'center', gap: 8 },
  pulse: { marginBottom: 4 },
  recordDot: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  duration: { fontSize: 20, fontWeight: '700', letterSpacing: 1 },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
