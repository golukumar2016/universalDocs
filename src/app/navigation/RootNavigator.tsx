import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './navigation.types';
import {
  InitialDocumentScreen,
  DocumentViewerScreen,
  UnsupportedDocumentScreen,
  FileBrowserScreen,
  FolderScreen,
} from '../../features/documents';
import { EditorScreen } from '../../features/editor';
import { MainNavigator } from './MainNavigator';
import { useAppTheme } from '../../shared/hooks';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const { themeColors } = useAppTheme();

  return (
    <Stack.Navigator
      initialRouteName="InitialDocument"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: themeColors.background },
        navigationBarColor: themeColors.surface,
        statusBarStyle: themeColors.statusBar === 'light-content' ? 'light' : 'dark',
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name="InitialDocument"
        component={InitialDocumentScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="FileBrowser"
        component={FileBrowserScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Folder"
        component={FolderScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="DocumentViewer"
        component={DocumentViewerScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="UnsupportedDocument"
        component={UnsupportedDocumentScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Editor"
        component={EditorScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="MainTabs" component={MainNavigator} />
    </Stack.Navigator>
  );
};

export default RootNavigator;
