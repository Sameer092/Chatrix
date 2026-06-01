import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Config } from '../constants/config';

// NOTE: Supabase session tokens (JWT + refresh token + user object) routinely
// exceed expo-secure-store's 2048-byte limit, which triggers the
// "Value being stored in SecureStore is larger than 2048 bytes" warning and
// can silently fail. AsyncStorage has no size limit and is the recommended
// session store for Expo + Supabase.
export const supabase = createClient(Config.supabaseUrl, Config.supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
