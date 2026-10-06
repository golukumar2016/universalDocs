import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { AppState, Text } from 'react-native';
import { AppLockProvider, useAppLock } from '../../src/features/security/context/AppLockContext';
import { AuthService } from '../../src/features/security/services/authService';
import { VaultService } from '../../src/features/security/services/vaultService';

describe('AppLockContext - Global Security Gate & Lifecycle Management', () => {
  beforeEach(async () => {
    await AuthService.removePin();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await AuthService.removePin();
  });

  let capturedLockContext: ReturnType<typeof useAppLock> | null = null;

  const TestConsumer: React.FC = () => {
    const lockCtx = useAppLock();
    capturedLockContext = lockCtx;
    return <Text testID="lockStatus">{lockCtx.isLocked ? 'LOCKED' : 'UNLOCKED'}</Text>;
  };

  it('provides security state and lock/unlock functions', async () => {
    await act(async () => {
      renderer.create(
        <AppLockProvider>
          <TestConsumer />
        </AppLockProvider>
      );
    });

    expect(capturedLockContext).not.toBeNull();
    expect(capturedLockContext?.hasPinSet).toBe(false);
    expect(capturedLockContext?.isLocked).toBe(false);

    // Manually locking
    await act(async () => {
      await capturedLockContext?.lockApp();
    });

    expect(capturedLockContext?.isLocked).toBe(true);

    // Unlocking
    act(() => {
      capturedLockContext?.unlockApp();
    });

    expect(capturedLockContext?.isLocked).toBe(false);
  });

  it('cleans decrypted files and sets secure flag on background transition', async () => {
    await act(async () => {
      renderer.create(
        <AppLockProvider>
          <TestConsumer />
        </AppLockProvider>
      );
    });

    // Setup PIN
    await act(async () => {
      await AuthService.savePin('1234');
      await capturedLockContext?.refreshSecurityState();
    });

    expect(capturedLockContext?.hasPinSet).toBe(true);
    expect(capturedLockContext?.isAppLockEnabled).toBe(true);

    const cleanSpy = jest.spyOn(VaultService, 'lockVaultAndClean');
    const secureFlagSpy = jest.spyOn(VaultService, 'setWindowSecureFlag');

    await act(async () => {
      const listeners = (AppState.addEventListener as jest.Mock).mock.calls;
      const lastListener = listeners[listeners.length - 1][1];
      await lastListener('background');
    });

    expect(cleanSpy).toHaveBeenCalled();
    expect(secureFlagSpy).toHaveBeenCalledWith(true);
  });

  it('verifies PIN and unlocks the application on match', async () => {
    await act(async () => {
      renderer.create(
        <AppLockProvider>
          <TestConsumer />
        </AppLockProvider>
      );
    });

    await act(async () => {
      await AuthService.savePin('4567');
      await capturedLockContext?.refreshSecurityState();
      await capturedLockContext?.lockApp();
    });

    expect(capturedLockContext?.isLocked).toBe(true);

    // Incorrect PIN
    let verifyRes;
    await act(async () => {
      verifyRes = await capturedLockContext?.verifyPin('0000');
    });
    expect(verifyRes?.success).toBe(false);
    expect(capturedLockContext?.isLocked).toBe(true);

    // Correct PIN
    await act(async () => {
      verifyRes = await capturedLockContext?.verifyPin('4567');
    });
    expect(verifyRes?.success).toBe(true);
    expect(capturedLockContext?.isLocked).toBe(false);
  });
});
