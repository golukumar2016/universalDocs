import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { DirectoryManager } from '../../core/filesystem/directoryManager';
import { AppDatabase } from '../../core/database/database';
import { ErrorHandler } from '../../core/errors/errorHandler';

interface AppProviderProps {
  children: React.ReactNode;
}

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
      <NavigationContainer>{children}</NavigationContainer>
    </SafeAreaProvider>
  );
};

export default AppProvider;
