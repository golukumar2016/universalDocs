import { NativeModules, Platform } from 'react-native';

const { AndroidNavigationBarModule } = NativeModules;

export interface SystemBarsThemeOptions {
  statusBarColor: string;
  isLightStatusBar: boolean;
  navigationBarColor: string;
  isLightNavigationBar: boolean;
}

/**
 * Synchronize Android system navigation bar (and buttons) color with current theme mode.
 * - navigationBarColor: The hex color for the navigation bar background.
 * - isLightNavigationBar: If true, buttons (Back, Home, Recents) turn DARK (for light backgrounds).
 *                         If false, buttons turn LIGHT/WHITE (for dark backgrounds).
 */
export const setAndroidNavigationBarTheme = async (
  navigationBarColor: string,
  isLightNavigationBar: boolean
): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return false;
  }

  if (AndroidNavigationBarModule?.setNavigationBarTheme) {
    try {
      return await AndroidNavigationBarModule.setNavigationBarTheme(
        navigationBarColor,
        isLightNavigationBar
      );
    } catch (e) {
      console.warn('Failed to set Android navigation bar theme:', e);
      return false;
    }
  }
  return false;
};

/**
 * Synchronize both Android system bars (status bar + navigation bar & buttons).
 */
export const setAndroidSystemBarsTheme = async (
  options: SystemBarsThemeOptions
): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return false;
  }

  if (AndroidNavigationBarModule?.setSystemBarsTheme) {
    try {
      return await AndroidNavigationBarModule.setSystemBarsTheme(
        options.statusBarColor,
        options.isLightStatusBar,
        options.navigationBarColor,
        options.isLightNavigationBar
      );
    } catch (e) {
      console.warn('Failed to set Android system bars theme:', e);
      return false;
    }
  } else {
    return await setAndroidNavigationBarTheme(
      options.navigationBarColor,
      options.isLightNavigationBar
    );
  }
};
