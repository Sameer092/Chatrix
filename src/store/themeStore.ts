import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/colors';

interface ThemeState {
  isDark: boolean;
  colors: typeof Colors.dark | typeof Colors.light;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      isDark: true,
      colors: Colors.dark,
      toggleTheme: () =>
        set((state) => ({
          isDark: !state.isDark,
          colors: state.isDark ? Colors.light : Colors.dark,
        })),
      setTheme: (isDark) =>
        set({ isDark, colors: isDark ? Colors.dark : Colors.light }),
    }),
    {
      name: 'chatrix-theme',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
