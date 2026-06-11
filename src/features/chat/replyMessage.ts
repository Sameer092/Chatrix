import type { Message } from '../../types';
import { decodeSharedPost } from '../feed/sharedPost';

/**
 * Replies are sent as ordinary text messages whose content begins with this
 * sentinel + a JSON payload holding the quoted message info plus the actual
 * reply text. This keeps replies migration-free (no reply_to column needed);
 * MessageBubble decodes it to render the quoted bar.
 */
const PREFIX = 'CHATRIX_REPLY::';

export interface ReplyPayload {
  text: string;     // the reply body
  toSender: string; // name of the person being replied to
  snippet: string;  // short preview of the quoted message
}

export function encodeReply(text: string, toSender: string, snippet: string): string {
  return PREFIX + JSON.stringify({ text, toSender, snippet });
}

export function decodeReply(content?: string | null): ReplyPayload | null {
  if (!content || !content.startsWith(PREFIX)) return null;
  try {
    return JSON.parse(content.slice(PREFIX.length)) as ReplyPayload;
  } catch {
    return null;
  }
}

/** Short human preview of any message (used for reply snippets & chat list). */
export function messageSnippet(message: Pick<Message, 'message_type' | 'content' | 'file_name' | 'is_deleted'>): string {
  if (message.is_deleted) return 'Message deleted';
  switch (message.message_type) {
    case 'image':
      return '📷 Photo';
    case 'voice':
      return '🎤 Voice note';
    case 'file':
      return `📎 ${message.file_name ?? 'File'}`;
    default: {
      const shared = decodeSharedPost(message.content);
      if (shared) return '🔗 Shared a post';
      const reply = decodeReply(message.content);
      return (reply ? reply.text : message.content) ?? '';
    }
  }
}
