import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './navigation.types';
import { MainNavigator } from './MainNavigator';
import { EditorScreen } from '../../features/editor';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="MainTabs" component={MainNavigator} />
      <Stack.Screen
        name="Editor"
        component={EditorScreen}
        options={{
          headerShown: true,
          title: 'Editor',
        }}
      />
    </Stack.Navigator>
  );
};

export default RootNavigator;
