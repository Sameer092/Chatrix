import { create } from 'zustand';
import type { Message, GroupMessage, Conversation } from '../types';

interface TypingUser {
  userId: string;
  conversationId: string;
}

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  typingUsers: TypingUser[];
  setConversations: (conversations: Conversation[]) => void;
  addOrUpdateConversation: (conversation: Conversation) => void;
  setActiveConversation: (id: string | null) => void;
  addTypingUser: (userId: string, conversationId: string) => void;
  removeTypingUser: (userId: string, conversationId: string) => void;
  getTypingUsers: (conversationId: string) => string[];
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  typingUsers: [],
  setConversations: (conversations) => set({ conversations }),
  addOrUpdateConversation: (conversation) =>
    set((state) => {
      const exists = state.conversations.find((c) => c.id === conversation.id);
      if (exists) {
        return {
          conversations: state.conversations.map((c) =>
            c.id === conversation.id ? conversation : c
          ),
        };
      }
      return { conversations: [conversation, ...state.conversations] };
    }),
  setActiveConversation: (id) => set({ activeConversationId: id }),
  addTypingUser: (userId, conversationId) =>
    set((state) => ({
      typingUsers: [
        ...state.typingUsers.filter(
          (t) => !(t.userId === userId && t.conversationId === conversationId)
        ),
        { userId, conversationId },
      ],
    })),
  removeTypingUser: (userId, conversationId) =>
    set((state) => ({
      typingUsers: state.typingUsers.filter(
        (t) => !(t.userId === userId && t.conversationId === conversationId)
      ),
    })),
  getTypingUsers: (conversationId) =>
    get()
      .typingUsers.filter((t) => t.conversationId === conversationId)
      .map((t) => t.userId),
}));
