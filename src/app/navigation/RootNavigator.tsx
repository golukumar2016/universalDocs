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

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="InitialDocument"
      screenOptions={{
        headerShown: false,
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
