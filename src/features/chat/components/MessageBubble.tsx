import React, { memo, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import { useNavigation } from '@react-navigation/native';

import { Avatar } from '../../../components/ui/Avatar';
import { useThemeStore } from '../../../store/themeStore';
import { formatTime, formatDuration, formatFileSize } from '../../../utils/formatters';
import { decodeSharedPost } from '../../feed/sharedPost';
import type { Message } from '../../../types';
import type { RootNavProp } from '../../../types/navigation.types';

interface MessageBubbleProps {
  message: Message;
  isMe: boolean;
  showAvatar?: boolean;
  /** Show the sender's name above the bubble (used in group chats). */
  showSenderName?: boolean;
}

/** Self-contained voice-note player using expo-av. */
const VoicePlayer: React.FC<{ uri: string; duration: number | null; isMe: boolean }> = ({
  uri,
  duration,
  isMe,
}) => {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  const onStatus = (status: any) => {
    if (!status.isLoaded) return;
    if (status.durationMillis) {
      setProgress(status.positionMillis / status.durationMillis);
    }
    if (status.didJustFinish) {
      setIsPlaying(false);
      setProgress(0);
      // Pause first so rewinding to 0 does NOT resume playback (which would
      // loop the note forever). setStatusAsync applies both atomically.
      soundRef.current?.setStatusAsync({ shouldPlay: false, positionMillis: 0 }).catch(() => {});
    }
  };

  const togglePlay = async () => {
    try {
      if (!soundRef.current) {
        setLoading(true);
        // Force playback out of "record mode" so audio routes to the speaker
        // (not the earpiece) — otherwise a just-recorded note plays silently.
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
        });
        const { sound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: true },
          onStatus
        );
        soundRef.current = sound;
        setLoading(false);
        setIsPlaying(true);
        return;
      }
      const status = await soundRef.current.getStatusAsync();
      if (status.isLoaded && status.isPlaying) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
      } else {
        await soundRef.current.playAsync();
        setIsPlaying(true);
      }
    } catch {
      setLoading(false);
      Alert.alert('Playback error', 'Could not play this voice note.');
    }
  };

  const tint = isMe ? 'rgba(255,255,255,0.6)' : '#6C63FF';
  const activeTint = isMe ? '#FFFFFF' : '#6C63FF';

  return (
    <TouchableOpacity style={styles.voiceNote} onPress={togglePlay} activeOpacity={0.8}>
      {loading ? (
        <ActivityIndicator size="small" color={activeTint} style={{ width: 36 }} />
      ) : (
        <Ionicons name={isPlaying ? 'pause-circle' : 'play-circle'} size={36} color={activeTint} />
      )}
      <View style={styles.voiceInfo}>
        <View style={styles.waveform}>
          {Array.from({ length: 20 }).map((_, i) => {
            const filled = i / 20 <= progress;
            return (
              <View
                key={i}
                style={[
                  styles.waveBar,
                  {
                    height: 5 + ((i * 7) % 16),
                    backgroundColor: filled ? activeTint : tint,
                  },
                ]}
              />
            );
          })}
        </View>
        <Text style={[styles.voiceDuration, { color: isMe ? 'rgba(255,255,255,0.7)' : '#94A3B8' }]}>
          {duration ? formatDuration(duration) : '0:00'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export const MessageBubble = memo(({ message, isMe, showAvatar, showSenderName }: MessageBubbleProps) => {
  const isDark = useThemeStore((s) => s.isDark);
  const navigation = useNavigation<RootNavProp>();

  if (message.is_deleted) {
    return (
      <View style={[styles.row, isMe ? styles.alignRight : styles.alignLeft]}>
        {showAvatar && !isMe && (
          <Avatar uri={message.sender?.avatar_url} name={message.sender?.name ?? ''} size={28} />
        )}
        <View style={[styles.deletedBubble, { borderColor: isDark ? '#2D2D6B' : '#E2E8F0' }]}>
          <Ionicons name="ban-outline" size={14} color="#64748B" style={{ marginRight: 6 }} />
          <Text style={styles.deletedText}>Message deleted</Text>
        </View>
      </View>
    );
  }

  const openFile = async () => {
    if (!message.file_url) return;
    try {
      const can = await Linking.canOpenURL(message.file_url);
      if (can) {
        await Linking.openURL(message.file_url);
      } else {
        Alert.alert('Cannot open', 'No app available to open this file.');
      }
    } catch {
      Alert.alert('Error', 'Could not open this file.');
    }
  };

  const openImage = () => {
    if (message.file_url) {
      navigation.navigate('ImageViewer', { uri: message.file_url });
    }
  };

  const shared =
    message.message_type === 'text' ? decodeSharedPost(message.content) : null;

  const renderSharedPost = () => {
    if (!shared) return null;
    const cardBg = isDark ? '#252550' : '#FFFFFF';
    const cardText = isDark ? '#FFFFFF' : '#1E293B';
    const cardSub = isDark ? '#94A3B8' : '#64748B';
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => navigation.navigate('PostDetail', { postId: shared.id })}
        style={[styles.sharedCard, { backgroundColor: cardBg }]}
      >
        <View style={styles.sharedHeader}>
          <Avatar uri={shared.authorAvatar} name={shared.authorName} size={26} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.sharedAuthor, { color: cardText }]} numberOfLines={1}>
              {shared.authorName}
            </Text>
            <Text style={[styles.sharedUsername, { color: cardSub }]} numberOfLines={1}>
              @{shared.authorUsername}
            </Text>
          </View>
        </View>
        {shared.image ? (
          <Image source={{ uri: shared.image }} style={styles.sharedImage} contentFit="cover" cachePolicy="memory-disk" />
        ) : null}
        {shared.content ? (
          <Text style={[styles.sharedText, { color: cardText }]} numberOfLines={3}>
            {shared.content}
          </Text>
        ) : null}
        <View style={[styles.sharedFooter, { borderTopColor: isDark ? '#2D2D6B' : '#E2E8F0' }]}>
          <Ionicons name="open-outline" size={13} color="#6C63FF" />
          <Text style={styles.sharedFooterText}>View post</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderContent = () => {
    if (shared) return renderSharedPost();
    switch (message.message_type) {
      case 'image':
        return (
          <TouchableOpacity activeOpacity={0.9} onPress={openImage}>
            <Image
              source={{ uri: message.file_url ?? undefined }}
              style={styles.imageContent}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          </TouchableOpacity>
        );
      case 'voice':
        return (
          <VoicePlayer
            uri={message.file_url ?? ''}
            duration={message.duration}
            isMe={isMe}
          />
        );
      case 'file':
        return (
          <TouchableOpacity style={styles.fileContent} onPress={openFile} activeOpacity={0.8}>
            <View style={[styles.fileIcon, { backgroundColor: isMe ? 'rgba(255,255,255,0.2)' : '#1A1A3E' }]}>
              <Ionicons name="document-text-outline" size={24} color={isMe ? '#FFFFFF' : '#6C63FF'} />
            </View>
            <View style={styles.fileInfo}>
              <Text
                style={[styles.fileName, { color: isMe ? '#FFFFFF' : isDark ? '#FFFFFF' : '#1E293B' }]}
                numberOfLines={1}
              >
                {message.file_name}
              </Text>
              <Text style={[styles.fileSize, { color: isMe ? 'rgba(255,255,255,0.7)' : '#94A3B8' }]}>
                {message.file_size ? formatFileSize(message.file_size) : 'Tap to open'}
              </Text>
            </View>
            <Ionicons name="download-outline" size={20} color={isMe ? '#FFFFFF' : '#6C63FF'} />
          </TouchableOpacity>
        );
      default:
        return (
          <Text style={[styles.textContent, { color: isMe ? '#FFFFFF' : isDark ? '#FFFFFF' : '#1E293B' }]}>
            {message.content}
          </Text>
        );
    }
  };

  // Image bubbles and shared-post cards look best without inner padding.
  const isImage = message.message_type === 'image' || !!shared;

  return (
    <View style={[styles.row, isMe ? styles.alignRight : styles.alignLeft]}>
      {!isMe && showAvatar ? (
        <Avatar uri={message.sender?.avatar_url} name={message.sender?.name ?? ''} size={28} />
      ) : !isMe ? (
        <View style={{ width: 28 }} />
      ) : null}

      <View style={[styles.bubbleContainer, isMe ? styles.bubbleAlignRight : styles.bubbleAlignLeft]}>
        {isMe ? (
          <LinearGradient
            colors={['#6C63FF', '#8579FF']}
            style={[styles.bubble, styles.bubbleMe, isImage && styles.bubbleImage]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {renderContent()}
          </LinearGradient>
        ) : (
          <View
            style={[
              styles.bubble,
              styles.bubbleOther,
              isImage && styles.bubbleImage,
              { backgroundColor: isDark ? '#1A1A3E' : '#FFFFFF' },
            ]}
          >
            {showSenderName && message.sender?.name ? (
              <Text style={styles.senderName}>{message.sender.name}</Text>
            ) : null}
            {renderContent()}
          </View>
        )}
        <Text style={[styles.timestamp, { textAlign: isMe ? 'right' : 'left' }]}>
          {formatTime(message.created_at)}
        </Text>
      </View>
    </View>
  );
});

MessageBubble.displayName = 'MessageBubble';

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', marginVertical: 3 },
  alignLeft: { justifyContent: 'flex-start', alignSelf: 'flex-start', maxWidth: '85%' },
  alignRight: { justifyContent: 'flex-end', alignSelf: 'flex-end', maxWidth: '85%' },
  bubbleContainer: { marginHorizontal: 8, maxWidth: '100%' },
  bubbleAlignLeft: { alignItems: 'flex-start' },
  bubbleAlignRight: { alignItems: 'flex-end' },
  bubble: {
    borderRadius: 18,
    padding: 12,
    maxWidth: 280,
  },
  bubbleImage: { padding: 4 },
  bubbleMe: { borderBottomRightRadius: 4 },
  bubbleOther: { borderBottomLeftRadius: 4 },
  textContent: { fontSize: 15, lineHeight: 22 },
  senderName: { color: '#6C63FF', fontSize: 12, fontWeight: '700', marginBottom: 4 },
  timestamp: { fontSize: 11, marginTop: 4, color: '#64748B' },
  sharedCard: {
    width: 240,
    borderRadius: 14,
    overflow: 'hidden',
  },
  sharedHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10 },
  sharedAuthor: { fontSize: 13, fontWeight: '700' },
  sharedUsername: { fontSize: 11, marginTop: 1 },
  sharedImage: { width: '100%', height: 150 },
  sharedText: { fontSize: 13, lineHeight: 18, padding: 10 },
  sharedFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 0.5,
  },
  sharedFooterText: { color: '#6C63FF', fontSize: 12, fontWeight: '600' },
  deletedBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  deletedText: { fontSize: 13, color: '#64748B', fontStyle: 'italic' },
  imageContent: { width: 200, height: 200, borderRadius: 14 },
  voiceNote: { flexDirection: 'row', alignItems: 'center', gap: 10, width: 200 },
  voiceInfo: { flex: 1 },
  waveform: { flexDirection: 'row', alignItems: 'center', gap: 2, height: 24 },
  waveBar: { width: 3, borderRadius: 2 },
  voiceDuration: { fontSize: 11, marginTop: 4 },
  fileContent: { flexDirection: 'row', alignItems: 'center', gap: 10, width: 220 },
  fileIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  fileInfo: { flex: 1 },
  fileName: { fontSize: 13, fontWeight: '600' },
  fileSize: { fontSize: 11, marginTop: 2 },
});
