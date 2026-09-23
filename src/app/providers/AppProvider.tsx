import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { DirectoryManager } from '../../core/filesystem/directoryManager';
import { AppDatabase } from '../../core/database/database';
import { ErrorHandler } from '../../core/errors/errorHandler';
import { ThemeProvider, useAppTheme } from '../../shared/theme';
import { navigationRef } from '../navigation/navigationRef';

interface AppProviderProps {
  children: React.ReactNode;
}

const NavigationWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isDark, themeColors } = useAppTheme();

  const baseTheme = isDark ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...baseTheme,
    dark: isDark,
    colors: {
      ...baseTheme.colors,
      primary: themeColors.primary,
      background: themeColors.background,
      card: themeColors.surface,
      text: themeColors.textPrimary,
      border: themeColors.border,
      notification: themeColors.error,
    },
  };

  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme}>
      {children}
    </NavigationContainer>
  );
};

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  useEffect(() => {
    const bootstrap = async () => {
      try {
        await DirectoryManager.initAppDirectories();
        await AppDatabase.getDatabase();
      } catch (error) {
        ErrorHandler.handle(error);
      }
    };

    bootstrap();
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <NavigationWrapper>{children}</NavigationWrapper>
      </ThemeProvider>
    </SafeAreaProvider>
  );
};

export default AppProvider;
