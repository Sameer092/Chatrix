import { useThemeStore } from '../store/themeStore';
import { Colors } from '../constants/colors';

export function useTheme() {
  const { isDark, colors, toggleTheme, setTheme } = useThemeStore();

  return {
    isDark,
    colors,
    toggleTheme,
    setTheme,
    Colors,
  };
}
