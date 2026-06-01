import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useThemeStore } from '../../../store/themeStore';
import { storageService } from '../../../services/storage.service';
import { useAuthStore } from '../../../store/authStore';
import { VoiceRecorder } from './VoiceRecorder';
import type { Message } from '../../../types';

interface FileData {
  url: string;
  name: string;
  size: number;
  duration?: number;
}

interface MessageInputProps {
  onSend: (content?: string, type?: Message['message_type'], fileData?: FileData) => void;
  onTypingChange: (isTyping: boolean) => void;
  conversationId: string;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  onTypingChange,
  conversationId,
}) => {
  const isDark = useThemeStore((s) => s.isDark);
  const userId = useAuthStore((s) => s.user?.id);
  const [text, setText] = useState('');
  const [showVoice, setShowVoice] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const typingTimeout = useRef<ReturnType<typeof setTimeout>>();

  const handleTextChange = (value: string) => {
    setText(value);
    if (value.length > 0) {
      onTypingChange(true);
      clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => onTypingChange(false), 3000);
    } else {
      onTypingChange(false);
    }
  };

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSend(trimmed, 'text');
    setText('');
    onTypingChange(false);
    clearTimeout(typingTimeout.current);
  }, [text, onSend, onTypingChange]);

  const handlePickImage = async () => {
    if (!userId) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setIsUploading(true);
      try {
        const { url, name, size } = await storageService.uploadMessageFile(
          userId, conversationId, result.assets[0].uri, 'image'
        );
        onSend(undefined, 'image', { url, name, size });
      } catch {
        Alert.alert('Error', 'Failed to send image');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handlePickDocument = async () => {
    if (!userId) return;
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setIsUploading(true);
      try {
        const { url, name, size } = await storageService.uploadMessageFile(
          userId, conversationId, asset.uri, 'file', asset.name
        );
        onSend(undefined, 'file', { url, name, size });
      } catch {
        Alert.alert('Error', 'Failed to send file');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleVoiceSend = async (uri: string, duration: number) => {
    if (!userId) return;
    setIsUploading(true);
    try {
      const { url, name, size } = await storageService.uploadMessageFile(
        userId, conversationId, uri, 'voice'
      );
      onSend(undefined, 'voice', { url, name, size, duration });
    } catch {
      Alert.alert('Error', 'Failed to send voice note');
    } finally {
      setIsUploading(false);
      setShowVoice(false);
    }
  };

  const bgColor = isDark ? '#1A1A3E' : '#FFFFFF';
  const inputBgColor = isDark ? '#252550' : '#F1F5F9';
  const textColor = isDark ? '#FFFFFF' : '#1E293B';
  const placeholderColor = isDark ? '#64748B' : '#94A3B8';

  if (showVoice) {
    return (
      <VoiceRecorder
        onSend={handleVoiceSend}
        onCancel={() => setShowVoice(false)}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bgColor, borderTopColor: isDark ? '#2D2D6B' : '#E2E8F0' }]}>
      <TouchableOpacity onPress={handlePickImage} style={styles.actionBtn}>
        <Ionicons name="image-outline" size={24} color="#6C63FF" />
      </TouchableOpacity>
      <TouchableOpacity onPress={handlePickDocument} style={styles.actionBtn}>
        <Ionicons name="attach-outline" size={24} color="#6C63FF" />
      </TouchableOpacity>

      <View style={[styles.inputContainer, { backgroundColor: inputBgColor }]}>
        <TextInput
          style={[styles.input, { color: textColor }]}
          placeholder={isUploading ? 'Uploading...' : 'Message...'}
          placeholderTextColor={placeholderColor}
          value={text}
          onChangeText={handleTextChange}
          multiline
          maxLength={1000}
          editable={!isUploading}
          returnKeyType="send"
          blurOnSubmit
          onSubmitEditing={handleSend}
        />
      </View>

      {text.trim().length > 0 ? (
        <TouchableOpacity onPress={handleSend}>
          <LinearGradient
            colors={['#6C63FF', '#8579FF']}
            style={styles.sendBtn}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="send" size={18} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity onPress={() => setShowVoice(true)} style={styles.actionBtn}>
          <Ionicons name="mic-outline" size={24} color="#6C63FF" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 0.5,
    paddingBottom: 24,
    gap: 8,
  },
  actionBtn: { padding: 6, alignSelf: 'flex-end', marginBottom: 4 },
  inputContainer: {
    flex: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 120,
  },
  input: { fontSize: 15, paddingVertical: 0, maxHeight: 100 },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
  },
});
