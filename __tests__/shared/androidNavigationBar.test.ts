import { NativeModules, Platform } from 'react-native';
import {
  setAndroidNavigationBarTheme,
  setAndroidSystemBarsTheme,
} from '../../src/shared/theme/androidNavigationBar';

describe('androidNavigationBar', () => {
  const originalPlatform = Platform.OS;

  afterEach(() => {
    Platform.OS = originalPlatform;
    jest.clearAllMocks();
  });

  describe('setAndroidNavigationBarTheme', () => {
    it('calls NativeModules.AndroidNavigationBarModule.setNavigationBarTheme on Android', async () => {
      Platform.OS = 'android';
      const result = await setAndroidNavigationBarTheme('#FFFFFF', true);

      expect(NativeModules.AndroidNavigationBarModule.setNavigationBarTheme).toHaveBeenCalledWith(
        '#FFFFFF',
        true
      );
      expect(result).toBe(true);
    });

    it('returns false immediately on non-Android platforms', async () => {
      Platform.OS = 'ios';
      const result = await setAndroidNavigationBarTheme('#FFFFFF', true);

      expect(NativeModules.AndroidNavigationBarModule.setNavigationBarTheme).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('handles native rejection gracefully', async () => {
      Platform.OS = 'android';
      (NativeModules.AndroidNavigationBarModule.setNavigationBarTheme as jest.Mock).mockRejectedValueOnce(
        new Error('Activity destroyed')
      );

      const result = await setAndroidNavigationBarTheme('#000000', false);
      expect(result).toBe(false);
    });
  });

  describe('setAndroidSystemBarsTheme', () => {
    it('calls NativeModules.AndroidNavigationBarModule.setSystemBarsTheme on Android', async () => {
      Platform.OS = 'android';
      const result = await setAndroidSystemBarsTheme({
        statusBarColor: '#F8FAFC',
        isLightStatusBar: true,
        navigationBarColor: '#FFFFFF',
        isLightNavigationBar: true,
      });

      expect(NativeModules.AndroidNavigationBarModule.setSystemBarsTheme).toHaveBeenCalledWith(
        '#F8FAFC',
        true,
        '#FFFFFF',
        true
      );
      expect(result).toBe(true);
    });

    it('returns false on non-Android platforms', async () => {
      Platform.OS = 'ios';
      const result = await setAndroidSystemBarsTheme({
        statusBarColor: '#0F172A',
        isLightStatusBar: false,
        navigationBarColor: '#1E293B',
        isLightNavigationBar: false,
      });

      expect(NativeModules.AndroidNavigationBarModule.setSystemBarsTheme).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });
});
