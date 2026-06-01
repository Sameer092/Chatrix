import Constants from 'expo-constants';

export const Config = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  app: {
    name: 'Chatrix',
    version: Constants.expoConfig?.version ?? '1.0.0',
    slug: 'chatrix',
  },
  pagination: {
    feedLimit: 10,
    messagesLimit: 30,
    searchLimit: 20,
    notificationsLimit: 20,
  },
  storage: {
    buckets: {
      avatars: 'avatars',
      covers: 'covers',
      posts: 'posts',
      messages: 'messages',
      groups: 'groups',
    },
    maxFileSizeMB: {
      avatar: 5,
      cover: 10,
      post: 50,
      message: 100,
    },
  },
  realtime: {
    heartbeatIntervalMs: 30000,
  },
  typing: {
    debounceMs: 1000,
    timeoutMs: 3000,
  },
} as const;
