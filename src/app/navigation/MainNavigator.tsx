import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from './navigation.types';
import { DocumentsScreen } from '../../features/documents';
import { SearchScreen } from '../../features/search';
import { ScannerScreen } from '../../features/scanner';
import { SecurityScreen } from '../../features/security';
import { useAppTheme } from '../../shared/hooks';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainNavigator: React.FC = () => {
  const { themeColors, isDark } = useAppTheme();

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
          fontSize: 18,
        },
        tabBarStyle: {
          backgroundColor: themeColors.surface,
          borderTopColor: themeColors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 8,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: isDark ? 0.25 : 0.06,
          shadowRadius: 6,
        },
        tabBarActiveTintColor: themeColors.primary,
        tabBarInactiveTintColor: themeColors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="DocumentsTab"
        component={DocumentsScreen}
        options={{
          title: 'Documents',
          tabBarLabel: 'Documents',
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.tabIconWrapper,
                focused && { backgroundColor: themeColors.badgeBg },
              ]}
            >
              <Text style={styles.tabEmoji}>📑</Text>
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="SearchTab"
        component={SearchScreen}
        options={{
          title: 'Search',
          tabBarLabel: 'Search',
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.tabIconWrapper,
                focused && { backgroundColor: themeColors.badgeBg },
              ]}
            >
              <Text style={styles.tabEmoji}>🔍</Text>
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="ScannerTab"
        component={ScannerScreen}
        options={{
          title: 'Scanner',
          tabBarLabel: 'Scanner',
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.tabIconWrapper,
                focused && { backgroundColor: themeColors.badgeBg },
              ]}
            >
              <Text style={styles.tabEmoji}>📷</Text>
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="SecurityTab"
        component={SecurityScreen}
        options={{
          title: 'Vault',
          tabBarLabel: 'Vault',
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.tabIconWrapper,
                focused && { backgroundColor: themeColors.badgeBg },
              ]}
            >
              <Text style={styles.tabEmoji}>🔒</Text>
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabIconWrapper: {
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabEmoji: {
    fontSize: 18,
  },
});

export default MainNavigator;
