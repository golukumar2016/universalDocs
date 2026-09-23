import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useColorScheme, Platform } from 'react-native';
import {
  ThemeColors,
  lightColors,
  darkColors,
  midnightColors,
  sepiaColors,
  oceanColors,
  allThemes,
  colors,
} from './palettes';
import { localStorage } from '../../core/storage/localStorage';
import { setAndroidSystemBarsTheme } from './androidNavigationBar';

export type ThemeMode = 'system' | 'light' | 'dark' | 'midnight' | 'sepia' | 'ocean';

export { allThemes };

export interface ThemeOption {
  id: ThemeMode;
  name: string;
  isDark: boolean;
  colorPreview: string;
  bgPreview: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  { id: 'system', name: 'System Default', isDark: false, colorPreview: '#2563EB', bgPreview: '#F8FAFC' },
  { id: 'light', name: 'Light Modern', isDark: false, colorPreview: '#2563EB', bgPreview: '#FFFFFF' },
  { id: 'dark', name: 'Dark Slate', isDark: true, colorPreview: '#3B82F6', bgPreview: '#0F172A' },
  { id: 'midnight', name: 'Midnight OLED', isDark: true, colorPreview: '#38BDF8', bgPreview: '#000000' },
  { id: 'sepia', name: 'Warm Sepia', isDark: false, colorPreview: '#B45309', bgPreview: '#FBF0D9' },
  { id: 'ocean', name: 'Nordic Ocean', isDark: true, colorPreview: '#14B8A6', bgPreview: '#0B192C' },
];

const THEME_STORAGE_KEY = 'app_user_theme_preference';

interface ThemeContextValue {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  themeColors: ThemeColors;
  isDark: boolean;
  themes: Record<string, ThemeColors>;
  themeOptions: ThemeOption[];
}

export const ThemeContext = createContext<ThemeContextValue>({
  themeMode: 'system',
  setThemeMode: async () => {},
  themeColors: darkColors,
  isDark: true,
  themes: allThemes,
  themeOptions: THEME_OPTIONS,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');

  // Load saved theme preference on mount
  useEffect(() => {
    let isMounted = true;
    localStorage
      .getItem(THEME_STORAGE_KEY)
      .then((saved) => {
        if (isMounted && saved && (saved in allThemes || saved === 'system')) {
          setThemeModeState(saved as ThemeMode);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (e) {
      console.warn('Failed to save theme preference', e);
    }
  }, []);

  const activeColors = useMemo<ThemeColors>(() => {
    if (themeMode === 'system') {
      return systemScheme === 'dark' ? darkColors : lightColors;
    }
    return allThemes[themeMode] || (systemScheme === 'dark' ? darkColors : lightColors);
  }, [themeMode, systemScheme]);

  // Synchronize Android system navigation bar & status bar buttons with active theme mode
  useEffect(() => {
    if (Platform.OS === 'android') {
      const isLightNavBar = !activeColors.isDark;
      const isLightStatusBar = activeColors.statusBar === 'dark-content';
      setAndroidSystemBarsTheme({
        statusBarColor: activeColors.background,
        isLightStatusBar,
        navigationBarColor: activeColors.surface,
        isLightNavigationBar: isLightNavBar,
      }).catch((e) => {
        console.warn('ThemeContext: Failed to update Android system bars:', e);
      });
    }
  }, [activeColors]);

  const value = useMemo(
    () => ({
      themeMode,
      setThemeMode,
      themeColors: activeColors,
      isDark: activeColors.isDark,
      themes: allThemes,
      themeOptions: THEME_OPTIONS,
    }),
    [themeMode, setThemeMode, activeColors]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useAppTheme = () => useContext(ThemeContext);
