import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from './navigation.types';
import { DocumentsScreen } from '../../features/documents';
import { SearchScreen } from '../../features/search';
import { ScannerScreen } from '../../features/scanner';
import { SecurityScreen } from '../../features/security';
import { useAppTheme } from '../../shared/hooks';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainNavigator: React.FC = () => {
  const { themeColors } = useAppTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: themeColors.surface,
          borderBottomColor: themeColors.border,
          borderBottomWidth: 1,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTitleStyle: {
          color: themeColors.textPrimary,
          fontWeight: '700',
          fontSize: 17,
        },
        tabBarStyle: {
          backgroundColor: themeColors.surface,
          borderTopColor: themeColors.border,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: themeColors.primary,
        tabBarInactiveTintColor: themeColors.textSecondary,
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
