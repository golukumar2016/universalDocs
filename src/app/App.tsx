import React from 'react';
import { StatusBar } from 'react-native';
import { AppProvider } from './providers/AppProvider';
import { RootNavigator } from './navigation/RootNavigator';
import { useAppTheme } from '../shared/hooks';

export const App: React.FC = () => {
  const { isDark } = useAppTheme();

  return (
    <AppProvider>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <RootNavigator />
    </AppProvider>
  );
};

export default App;
