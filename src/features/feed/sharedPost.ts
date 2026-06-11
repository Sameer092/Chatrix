import type { Post } from '../../types';

/**
 * Shared posts are transmitted as ordinary text messages whose content begins
 * with this sentinel followed by a JSON snapshot of the post. This avoids a DB
 * schema/message-type change while still letting the chat render a rich,
 * tappable card. MessageBubble decodes it; plain messages are unaffected.
 */
const PREFIX = 'CHATRIX_SHARED_POST::';

export interface SharedPostPayload {
  id: string;
  content: string;
  image: string | null;
  authorName: string;
  authorUsername: string;
  authorAvatar: string | null;
}

export function encodeSharedPost(post: Post): string {
  const payload: SharedPostPayload = {
    id: post.id,
    content: (post.content ?? '').slice(0, 280),
    image: post.image_urls?.[0] ?? null,
    authorName: post.author?.name ?? '',
    authorUsername: post.author?.username ?? '',
    authorAvatar: post.author?.avatar_url ?? null,
  };
  return PREFIX + JSON.stringify(payload);
}

export function decodeSharedPost(content?: string | null): SharedPostPayload | null {
  if (!content || !content.startsWith(PREFIX)) return null;
  try {
    return JSON.parse(content.slice(PREFIX.length)) as SharedPostPayload;
  } catch {
    return null;
  }
}

export function isSharedPostContent(content?: string | null): boolean {
  return !!content && content.startsWith(PREFIX);
}
