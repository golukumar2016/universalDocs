import { useColorScheme } from 'react-native';
import { colors, darkColors } from '../theme';

export function useAppTheme() {
  const isDark = useColorScheme() === 'dark';
  return {
    isDark,
    themeColors: isDark ? darkColors : colors,
  };
}
