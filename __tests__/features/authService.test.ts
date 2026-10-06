import { AuthService, MAX_FAILED_ATTEMPTS } from '../../src/features/security/services/authService';
import { SecureStorage } from '../../src/core/storage/secureStorage';
import { STORAGE_KEYS } from '../../src/shared/constants';

describe('AuthService - PIN Hashing, Rate-Limiting Lockout, & Biometrics', () => {
  beforeEach(async () => {
    await AuthService.removePin();
  });

  afterEach(async () => {
    await AuthService.removePin();
  });

  it('saves PIN securely using salt + SHA-256 hash', async () => {
    await AuthService.savePin('4321');

    const hasPin = await AuthService.hasPinSet();
    expect(hasPin).toBe(true);

    const storedHash = await SecureStorage.getSecureItem(STORAGE_KEYS.AUTH_PIN);
    expect(storedHash).toBeDefined();
    // Raw PIN should NOT be stored
    expect(storedHash).not.toBe('4321');
    expect(storedHash?.length).toBe(64);

    const storedSalt = await SecureStorage.getSecureItem(STORAGE_KEYS.AUTH_SALT);
    expect(storedSalt).toBeDefined();
  });

  it('rejects PINs shorter than 4 digits', async () => {
    await expect(AuthService.savePin('12')).rejects.toThrow();
  });

  it('verifies correct PIN and rejects incorrect PIN', async () => {
    await AuthService.savePin('9999');

    const validResult = await AuthService.verifyPin('9999');
    expect(validResult.success).toBe(true);

    const wrongResult = await AuthService.verifyPin('0000');
    expect(wrongResult.success).toBe(false);
    expect(wrongResult.attemptsLeft).toBe(MAX_FAILED_ATTEMPTS - 1);
  });

  it('enforces lockout rate-limiting after 5 consecutive failed PIN attempts', async () => {
    await AuthService.savePin('1234');

    // Fail 4 times
    for (let i = 1; i <= 4; i++) {
      const res = await AuthService.verifyPin('0000');
      expect(res.success).toBe(false);
      expect(res.isLockedOut).toBe(false);
      expect(res.attemptsLeft).toBe(MAX_FAILED_ATTEMPTS - i);
    }

    // 5th failure triggers lockout
    const fifthAttempt = await AuthService.verifyPin('0000');
    expect(fifthAttempt.success).toBe(false);
    expect(fifthAttempt.isLockedOut).toBe(true);
    expect(fifthAttempt.remainingSeconds).toBeGreaterThan(0);

    // Subsequent attempts during lockout are rejected immediately without checking PIN
    const lockedAttempt = await AuthService.verifyPin('1234'); // Even correct PIN is blocked during lockout
    expect(lockedAttempt.success).toBe(false);
    expect(lockedAttempt.isLockedOut).toBe(true);
  });

  it('clears failed attempts upon entering correct PIN', async () => {
    await AuthService.savePin('5555');

    // Fail twice
    await AuthService.verifyPin('1111');
    await AuthService.verifyPin('2222');

    // Succeed
    const success = await AuthService.verifyPin('5555');
    expect(success.success).toBe(true);

    // Lockout state should be reset
    const lockoutState = await AuthService.getLockoutState();
    expect(lockoutState.failedAttempts).toBe(0);
    expect(lockoutState.isLockedOut).toBe(false);
  });

  it('removes PIN and disables app lock setting', async () => {
    await AuthService.savePin('7777');
    expect(await AuthService.hasPinSet()).toBe(true);

    await AuthService.removePin();
    expect(await AuthService.hasPinSet()).toBe(false);
    expect(await AuthService.isAppLockEnabled()).toBe(false);
  });

  it('manages auto-lock timeout preferences and converts to milliseconds', async () => {
    await AuthService.setLockTimeout('5m');
    const pref = await AuthService.getLockTimeout();
    expect(pref).toBe('5m');

    expect(AuthService.getLockTimeoutMs('immediately')).toBe(0);
    expect(AuthService.getLockTimeoutMs('1m')).toBe(60000);
    expect(AuthService.getLockTimeoutMs('5m')).toBe(300000);
    expect(AuthService.getLockTimeoutMs('15m')).toBe(900000);
  });

  it('toggles and manages biometric settings', async () => {
    await AuthService.setBiometricEnabled(true);
    expect(await AuthService.isBiometricEnabled()).toBe(true);

    await AuthService.setBiometricEnabled(false);
    expect(await AuthService.isBiometricEnabled()).toBe(false);
  });
});
