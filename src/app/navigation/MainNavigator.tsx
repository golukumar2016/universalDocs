import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from './navigation.types';
import { DocumentsScreen } from '../../features/documents';
import { SearchScreen } from '../../features/search';
import { ScannerScreen } from '../../features/scanner';
import { SecurityScreen } from '../../features/security';
import { useAppTheme } from '../../shared/hooks';

const Tab = createBottomTabNavigator<MainTabParamList>();

// --- Dynamic Styled Mobile Navigation Button Icons (react to theme colors) ---

const DocumentsTabIcon: React.FC<{ color: string; focused: boolean }> = ({ color, focused }) => (
  <View style={styles.iconDocWrapper}>
    <View
      style={[
        styles.iconDocBody,
        {
          borderColor: color,
          backgroundColor: focused ? color + '22' : 'transparent',
        },
      ]}
    >
      <View style={[styles.iconDocLine, { backgroundColor: color, width: 10, marginTop: 4 }]} />
      <View style={[styles.iconDocLine, { backgroundColor: color, width: 12, marginTop: 2.5 }]} />
      <View style={[styles.iconDocLine, { backgroundColor: color, width: 7, marginTop: 2.5 }]} />
    </View>
  </View>
);

const SearchTabIcon: React.FC<{ color: string; focused: boolean }> = ({ color, focused }) => (
  <View style={styles.iconSearchWrapper}>
    <View
      style={[
        styles.iconSearchLens,
        {
          borderColor: color,
          backgroundColor: focused ? color + '22' : 'transparent',
        },
      ]}
    />
    <View style={[styles.iconSearchHandle, { backgroundColor: color }]} />
  </View>
);

const ScannerTabIcon: React.FC<{ color: string; focused: boolean }> = ({ color, focused }) => (
  <View style={styles.iconScannerWrapper}>
    <View style={[styles.scannerCorner, styles.cornerTL, { borderColor: color }]} />
    <View style={[styles.scannerCorner, styles.cornerTR, { borderColor: color }]} />
    <View style={[styles.scannerCorner, styles.cornerBL, { borderColor: color }]} />
    <View style={[styles.scannerCorner, styles.cornerBR, { borderColor: color }]} />
    <View style={[styles.scannerCenterLine, { backgroundColor: color }]} />
  </View>
);

const SecurityTabIcon: React.FC<{ color: string; focused: boolean }> = ({ color, focused }) => (
  <View style={styles.iconVaultWrapper}>
    <View style={[styles.vaultShackle, { borderColor: color }]} />
    <View
      style={[
        styles.vaultBody,
        {
          borderColor: color,
          backgroundColor: focused ? color : 'transparent',
        },
      ]}
    >
      <View
        style={[
          styles.vaultHole,
          { backgroundColor: focused ? '#FFFFFF' : color },
        ]}
      />
    </View>
  </View>
);

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
              <DocumentsTabIcon color={color} focused={focused} />
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
              <SearchTabIcon color={color} focused={focused} />
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
              <ScannerTabIcon color={color} focused={focused} />
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
              <SecurityTabIcon color={color} focused={focused} />
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
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Document Icon
  iconDocWrapper: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconDocBody: {
    width: 17,
    height: 21,
    borderWidth: 1.8,
    borderRadius: 3,
    paddingHorizontal: 2,
    alignItems: 'flex-start',
  },
  iconDocLine: {
    height: 1.5,
    borderRadius: 1,
  },

  // Search Icon
  iconSearchWrapper: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconSearchLens: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.8,
    position: 'absolute',
    top: 2,
    left: 2,
  },
  iconSearchHandle: {
    width: 2,
    height: 7,
    borderRadius: 1,
    position: 'absolute',
    bottom: 2,
    right: 4,
    transform: [{ rotate: '-45deg' }],
  },

  // Scanner Icon
  iconScannerWrapper: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  scannerCorner: {
    position: 'absolute',
    width: 6,
    height: 6,
  },
  cornerTL: {
    top: 2,
    left: 2,
    borderTopWidth: 2,
    borderLeftWidth: 2,
  },
  cornerTR: {
    top: 2,
    right: 2,
    borderTopWidth: 2,
    borderRightWidth: 2,
  },
  cornerBL: {
    bottom: 2,
    left: 2,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
  },
  cornerBR: {
    bottom: 2,
    right: 2,
    borderBottomWidth: 2,
    borderRightWidth: 2,
  },
  scannerCenterLine: {
    width: 12,
    height: 2,
    borderRadius: 1,
  },

  // Vault / Lock Icon
  iconVaultWrapper: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vaultShackle: {
    width: 10,
    height: 8,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    borderWidth: 1.8,
    borderBottomWidth: 0,
    marginBottom: -1,
  },
  vaultBody: {
    width: 16,
    height: 12,
    borderRadius: 3,
    borderWidth: 1.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vaultHole: {
    width: 2,
    height: 4,
    borderRadius: 1,
  },
});

export default MainNavigator;
