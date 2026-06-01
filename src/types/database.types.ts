export type MessageType = 'text' | 'image' | 'voice' | 'file';
export type FriendRequestStatus = 'pending' | 'accepted' | 'rejected';
export type GroupMemberRole = 'admin' | 'member';
export type NotificationType =
  | 'like'
  | 'comment'
  | 'friend_request'
  | 'friend_accepted'
  | 'message'
  | 'group_invite'
  | 'group_message';

export interface Profile {
  id: string;
  username: string;
  name: string;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  is_online: boolean;
  last_seen: string;
  is_private: boolean;
  push_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  content: string;
  image_urls: string[];
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
  author?: Profile;
  is_liked?: boolean;
}

export interface PostLike {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  author?: Profile;
}

export interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  created_at: string;
  friend?: Profile;
}

export interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: FriendRequestStatus;
  created_at: string;
  updated_at: string;
  sender?: Profile;
  receiver?: Profile;
}

export interface Conversation {
  id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  other_member?: Profile;
  last_message?: Message;
  unread_count?: number;
}

export interface ConversationMember {
  id: string;
  conversation_id: string;
  user_id: string;
  joined_at: string;
  last_read_at: string;
  profile?: Profile;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  message_type: MessageType;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  duration: number | null;
  is_deleted: boolean;
  created_at: string;
  sender?: Profile;
  read_by?: string[];
}

export interface MessageRead {
  id: string;
  message_id: string;
  user_id: string;
  read_at: string;
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  member_count?: number;
  last_message?: GroupMessage;
  my_role?: GroupMemberRole;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: GroupMemberRole;
  joined_at: string;
  last_read_at: string;
  profile?: Profile;
}

export interface GroupMessage {
  id: string;
  group_id: string;
  sender_id: string;
  content: string | null;
  message_type: MessageType;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  duration: number | null;
  is_deleted: boolean;
  created_at: string;
  sender?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  actor_id: string;
  type: NotificationType;
  entity_id: string | null;
  entity_type: string | null;
  is_read: boolean;
  created_at: string;
  actor?: Profile;
}

export interface UploadedFile {
  id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  bucket: string;
  public_url: string | null;
  created_at: string;
}
