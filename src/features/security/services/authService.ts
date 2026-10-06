import ReactNativeBiometrics, { BiometryType } from 'react-native-biometrics';
import { SecureStorage } from '../../../core/storage/secureStorage';
import { STORAGE_KEYS } from '../../../shared/constants';
import { SecurityError } from '../../../core/errors/AppError';
import { LockTimeoutOption, SecuritySettingsState } from '../vault.types';
import { sha256, generateRandomSalt } from '../utils/cryptoUtils';

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 30 * 1000; // 30 seconds

export class AuthService {
  private static rnBiometrics = new ReactNativeBiometrics();

  /**
   * Hashes a PIN with a salt using SHA-256.
   */
  static hashPin(pin: string, salt: string): string {
    return sha256(`${salt}:${pin}`);
  }

  /**
   * Checks whether the user has configured an application PIN.
   */
  static async hasPinSet(): Promise<boolean> {
    try {
      const pinHash = await SecureStorage.getSecureItem(STORAGE_KEYS.AUTH_PIN);
      return !!pinHash;
    } catch {
      return false;
    }
  }

  /**
   * Saves or updates the application PIN using a unique salt and SHA-256 hash.
   */
  static async savePin(pin: string): Promise<boolean> {
    if (!pin || pin.length < 4) {
      throw new SecurityError('PIN must be at least 4 digits');
    }

    try {
      const salt = generateRandomSalt(16);
      const hash = this.hashPin(pin, salt);

      await SecureStorage.setSecureItem(STORAGE_KEYS.AUTH_SALT, salt);
      await SecureStorage.setSecureItem(STORAGE_KEYS.AUTH_PIN, hash);
      // When PIN is saved, default App Lock to enabled
      await SecureStorage.setSecureItem(STORAGE_KEYS.APP_LOCK_ENABLED, 'true');
      await this.resetFailedAttempts();

      return true;
    } catch (error: any) {
      throw new SecurityError(`Failed to save security PIN: ${error?.message || error}`, error);
    }
  }

  /**
   * Removes the configured PIN and disables app lock.
   */
  static async removePin(): Promise<boolean> {
    try {
      await SecureStorage.removeSecureItem(STORAGE_KEYS.AUTH_PIN);
      await SecureStorage.removeSecureItem(STORAGE_KEYS.AUTH_SALT);
      await SecureStorage.removeSecureItem(STORAGE_KEYS.APP_LOCK_ENABLED);
      await this.resetFailedAttempts();
      return true;
    } catch (error: any) {
      throw new SecurityError(`Failed to remove PIN: ${error?.message || error}`, error);
    }
  }

  /**
   * Checks the current lockout state.
   */
  static async getLockoutState(): Promise<{
    isLockedOut: boolean;
    remainingSeconds: number;
    failedAttempts: number;
  }> {
    try {
      const lockoutStr = await SecureStorage.getSecureItem(STORAGE_KEYS.LOCKOUT_UNTIL);
      const attemptsStr = await SecureStorage.getSecureItem(STORAGE_KEYS.FAILED_ATTEMPTS);
      const failedAttempts = attemptsStr ? parseInt(attemptsStr, 10) || 0 : 0;

      if (lockoutStr) {
        const lockoutUntil = parseInt(lockoutStr, 10);
        const now = Date.now();
        if (now < lockoutUntil) {
          const remainingSeconds = Math.max(1, Math.ceil((lockoutUntil - now) / 1000));
          return { isLockedOut: true, remainingSeconds, failedAttempts };
        } else {
          // Lockout expired, clear lockoutUntil
          await SecureStorage.removeSecureItem(STORAGE_KEYS.LOCKOUT_UNTIL);
        }
      }

      return { isLockedOut: false, remainingSeconds: 0, failedAttempts };
    } catch {
      return { isLockedOut: false, remainingSeconds: 0, failedAttempts: 0 };
    }
  }

  /**
   * Records a failed PIN attempt, triggering lockout if threshold is exceeded.
   */
  static async recordFailedAttempt(): Promise<{
    isLockedOut: boolean;
    remainingSeconds: number;
    attemptsLeft: number;
  }> {
    try {
      const attemptsStr = await SecureStorage.getSecureItem(STORAGE_KEYS.FAILED_ATTEMPTS);
      const currentAttempts = (attemptsStr ? parseInt(attemptsStr, 10) || 0 : 0) + 1;
      await SecureStorage.setSecureItem(STORAGE_KEYS.FAILED_ATTEMPTS, currentAttempts.toString());

      if (currentAttempts >= MAX_FAILED_ATTEMPTS) {
        const lockoutUntil = Date.now() + LOCKOUT_DURATION_MS;
        await SecureStorage.setSecureItem(STORAGE_KEYS.LOCKOUT_UNTIL, lockoutUntil.toString());
        return {
          isLockedOut: true,
          remainingSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000),
          attemptsLeft: 0,
        };
      }

      return {
        isLockedOut: false,
        remainingSeconds: 0,
        attemptsLeft: Math.max(0, MAX_FAILED_ATTEMPTS - currentAttempts),
      };
    } catch {
      return { isLockedOut: false, remainingSeconds: 0, attemptsLeft: 0 };
    }
  }

  /**
   * Resets failed attempts and lockout timers upon successful authentication.
   */
  static async resetFailedAttempts(): Promise<void> {
    try {
      await SecureStorage.removeSecureItem(STORAGE_KEYS.FAILED_ATTEMPTS);
      await SecureStorage.removeSecureItem(STORAGE_KEYS.LOCKOUT_UNTIL);
    } catch {
      // Ignore cleanup error
    }
  }

  /**
   * Verifies the provided PIN against the securely stored hash.
   */
  static async verifyPin(pin: string): Promise<{
    success: boolean;
    isLockedOut?: boolean;
    remainingSeconds?: number;
    attemptsLeft?: number;
  }> {
    const lockout = await this.getLockoutState();
    if (lockout.isLockedOut) {
      return {
        success: false,
        isLockedOut: true,
        remainingSeconds: lockout.remainingSeconds,
        attemptsLeft: 0,
      };
    }

    try {
      const storedHash = await SecureStorage.getSecureItem(STORAGE_KEYS.AUTH_PIN);
      if (!storedHash) {
        return { success: false };
      }

      let salt = await SecureStorage.getSecureItem(STORAGE_KEYS.AUTH_SALT);
      let calculatedHash: string;

      if (salt) {
        calculatedHash = this.hashPin(pin, salt);
      } else {
        // Fallback for legacy plain PIN if migrating
        if (storedHash === pin) {
          // Auto migrate to salted hash
          const newSalt = generateRandomSalt(16);
          const newHash = this.hashPin(pin, newSalt);
          await SecureStorage.setSecureItem(STORAGE_KEYS.AUTH_SALT, newSalt);
          await SecureStorage.setSecureItem(STORAGE_KEYS.AUTH_PIN, newHash);
          await this.resetFailedAttempts();
          return { success: true };
        }
        calculatedHash = pin;
      }

      if (calculatedHash === storedHash) {
        await this.resetFailedAttempts();
        return { success: true };
      }

      const failResult = await this.recordFailedAttempt();
      return {
        success: false,
        isLockedOut: failResult.isLockedOut,
        remainingSeconds: failResult.remainingSeconds,
        attemptsLeft: failResult.attemptsLeft,
      };
    } catch (error: any) {
      throw new SecurityError(`Failed to verify PIN: ${error?.message || error}`, error);
    }
  }

  /**
   * Checks biometric sensor availability and type on the device.
   */
  static async checkBiometrics(): Promise<{ available: boolean; biometryType: BiometryType | 'None' }> {
    try {
      const { available, biometryType } = await this.rnBiometrics.isSensorAvailable();
      return {
        available: Boolean(available),
        biometryType: available && biometryType ? biometryType : 'None',
      };
    } catch {
      return { available: false, biometryType: 'None' };
    }
  }

  /**
   * Checks whether biometric unlock is enabled in settings.
   */
  static async isBiometricEnabled(): Promise<boolean> {
    try {
      const value = await SecureStorage.getSecureItem(STORAGE_KEYS.BIOMETRIC_ENABLED);
      return value === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Enables or disables biometric unlock.
   */
  static async setBiometricEnabled(enabled: boolean): Promise<boolean> {
    try {
      if (enabled) {
        await SecureStorage.setSecureItem(STORAGE_KEYS.BIOMETRIC_ENABLED, 'true');
      } else {
        await SecureStorage.removeSecureItem(STORAGE_KEYS.BIOMETRIC_ENABLED);
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Triggers native biometric authentication dialog.
   */
  static async authenticateBiometrics(
    promptMessage: string = 'Confirm biometric identity to unlock UniversalDocs'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.rnBiometrics.simplePrompt({
        promptMessage,
        cancelButtonText: 'Cancel',
      });
      if (result.success) {
        await this.resetFailedAttempts();
        return { success: true };
      }
      return { success: false, error: 'User canceled biometric verification' };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Biometric authentication failed' };
    }
  }

  /**
   * Checks whether App Lock is enabled.
   */
  static async isAppLockEnabled(): Promise<boolean> {
    try {
      const hasPin = await this.hasPinSet();
      if (!hasPin) return false;
      const enabled = await SecureStorage.getSecureItem(STORAGE_KEYS.APP_LOCK_ENABLED);
      return enabled !== 'false';
    } catch {
      return false;
    }
  }

  /**
   * Sets App Lock enabled status.
   */
  static async setAppLockEnabled(enabled: boolean): Promise<boolean> {
    try {
      await SecureStorage.setSecureItem(STORAGE_KEYS.APP_LOCK_ENABLED, enabled ? 'true' : 'false');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Retrieves the user's preferred lock timeout setting.
   */
  static async getLockTimeout(): Promise<LockTimeoutOption> {
    try {
      const timeout = (await SecureStorage.getSecureItem(STORAGE_KEYS.LOCK_TIMEOUT)) as LockTimeoutOption;
      if (timeout && ['immediately', '1m', '5m', '15m'].includes(timeout)) {
        return timeout;
      }
      return 'immediately';
    } catch {
      return 'immediately';
    }
  }

  /**
   * Saves the preferred lock timeout setting.
   */
  static async setLockTimeout(timeout: LockTimeoutOption): Promise<boolean> {
    try {
      await SecureStorage.setSecureItem(STORAGE_KEYS.LOCK_TIMEOUT, timeout);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Converts lock timeout option to milliseconds.
   */
  static getLockTimeoutMs(timeout: LockTimeoutOption): number {
    switch (timeout) {
      case '1m':
        return 60 * 1000;
      case '5m':
        return 5 * 60 * 1000;
      case '15m':
        return 15 * 60 * 1000;
      case 'immediately':
      default:
        return 0;
    }
  }

  /**
   * Retrieves complete security settings state.
   */
  static async getSecuritySettings(): Promise<SecuritySettingsState> {
    const [hasPin, bioCheck, bioEnabled, appLockEnabled, lockTimeout] = await Promise.all([
      this.hasPinSet(),
      this.checkBiometrics(),
      this.isBiometricEnabled(),
      this.isAppLockEnabled(),
      this.getLockTimeout(),
    ]);

    return {
      hasPinSet: hasPin,
      isBiometricAvailable: bioCheck.available,
      isBiometricEnabled: bioEnabled,
      biometryType: bioCheck.biometryType,
      lockTimeout,
      isAppLockEnabled: appLockEnabled,
    };
  }
}

export default AuthService;
