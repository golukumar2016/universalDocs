import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from './navigation.types';
import { DocumentsScreen } from '../../features/documents';
import { SearchScreen } from '../../features/search';
import { ScannerScreen } from '../../features/scanner';
import { SecurityScreen } from '../../features/security';
import { colors } from '../../shared/theme';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
      }}
    >
      <Tab.Screen
        name="DocumentsTab"
        component={DocumentsScreen}
        options={{ title: 'Documents' }}
      />
      <Tab.Screen
        name="SearchTab"
        component={SearchScreen}
        options={{ title: 'Search' }}
      />
      <Tab.Screen
        name="ScannerTab"
        component={ScannerScreen}
        options={{ title: 'Scanner' }}
      />
      <Tab.Screen
        name="SecurityTab"
        component={SecurityScreen}
        options={{ title: 'Vault' }}
      />
    </Tab.Navigator>
  );
};

export default MainNavigator;
