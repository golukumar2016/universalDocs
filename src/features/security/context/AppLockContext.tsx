import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { AuthService } from '../services/authService';
import { VaultService } from '../services/vaultService';
import { LockTimeoutOption } from '../vault.types';

export interface AppLockContextType {
  isLocked: boolean;
  hasPinSet: boolean;
  isAppLockEnabled: boolean;
  isBiometricEnabled: boolean;
  isBiometricAvailable: boolean;
  biometryType: string;
  lockTimeout: LockTimeoutOption;
  isCheckingAuth: boolean;
  lockApp: () => Promise<void>;
  unlockApp: () => void;
  verifyPin: (pin: string) => Promise<{
    success: boolean;
    isLockedOut?: boolean;
    remainingSeconds?: number;
    attemptsLeft?: number;
  }>;
  triggerBiometrics: () => Promise<boolean>;
  refreshSecurityState: () => Promise<void>;
}

const AppLockContext = createContext<AppLockContextType | undefined>(undefined);

export const AppLockProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [hasPinSet, setHasPinSet] = useState<boolean>(false);
  const [isAppLockEnabled, setIsAppLockEnabled] = useState<boolean>(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState<boolean>(false);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState<boolean>(false);
  const [biometryType, setBiometryType] = useState<string>('None');
  const [lockTimeout, setLockTimeoutState] = useState<LockTimeoutOption>('immediately');
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);

  const backgroundTimeRef = useRef<number | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const refreshSecurityState = useCallback(async () => {
    try {
      const settings = await AuthService.getSecuritySettings();
      setHasPinSet(settings.hasPinSet);
      setIsAppLockEnabled(settings.isAppLockEnabled);
      setIsBiometricEnabled(settings.isBiometricEnabled);
      setIsBiometricAvailable(settings.isBiometricAvailable);
      setBiometryType(settings.biometryType);
      setLockTimeoutState(settings.lockTimeout);
      return settings;
    } catch (e) {
      console.warn('AppLockProvider: Failed to load security settings:', e);
      return null;
    }
  }, []);

  const lockApp = useCallback(async () => {
    setIsLocked(true);
    await Promise.all([
      VaultService.lockVaultAndClean(),
      VaultService.setWindowSecureFlag(true),
    ]);
  }, []);

  const unlockApp = useCallback(() => {
    setIsLocked(false);
  }, []);

  const verifyPin = useCallback(
    async (pin: string) => {
      const result = await AuthService.verifyPin(pin);
      if (result.success) {
        setIsLocked(false);
      }
      return result;
    },
    []
  );

  const triggerBiometrics = useCallback(async () => {
    if (!isBiometricEnabled) return false;
    const result = await AuthService.authenticateBiometrics();
    if (result.success) {
      setIsLocked(false);
      return true;
    }
    return false;
  }, [isBiometricEnabled]);

  // Initial bootstrap: check security settings and lock if enabled
  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        const settings = await refreshSecurityState();
        if (isMounted && settings && settings.hasPinSet && settings.isAppLockEnabled) {
          setIsLocked(true);
          await Promise.all([
            VaultService.lockVaultAndClean(),
            VaultService.setWindowSecureFlag(true),
          ]);

          // Prompt biometrics if enabled
          if (settings.isBiometricEnabled) {
            setTimeout(async () => {
              if (isMounted) {
                const bioResult = await AuthService.authenticateBiometrics();
                if (bioResult.success && isMounted) {
                  setIsLocked(false);
                }
              }
            }, 300);
          }
        }
      } finally {
        if (isMounted) {
          setIsCheckingAuth(false);
        }
      }
    }

    init();

    return () => {
      isMounted = false;
    };
  }, [refreshSecurityState]);

  // AppState background/foreground listener
  useEffect(() => {
    const handleAppStateChange = async (nextState: AppStateStatus) => {
      appStateRef.current = nextState;

      if (nextState === 'background' || nextState === 'inactive') {
        backgroundTimeRef.current = Date.now();
        // Immediately clean temp decrypted files and set FLAG_SECURE on background
        await Promise.all([
          VaultService.lockVaultAndClean(),
          VaultService.setWindowSecureFlag(true),
        ]);
      } else if (nextState === 'active') {
        const bgTime = backgroundTimeRef.current;
        backgroundTimeRef.current = null;

        if (hasPinSet && isAppLockEnabled && bgTime) {
          const elapsed = Date.now() - bgTime;
          const timeoutMs = AuthService.getLockTimeoutMs(lockTimeout);

          if (elapsed >= timeoutMs) {
            setIsLocked(true);
            await VaultService.lockVaultAndClean();

            if (isBiometricEnabled) {
              setTimeout(async () => {
                const bioResult = await AuthService.authenticateBiometrics();
                if (bioResult.success) {
                  setIsLocked(false);
                }
              }, 200);
            }
          }
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [hasPinSet, isAppLockEnabled, lockTimeout, isBiometricEnabled]);

  const value: AppLockContextType = {
    isLocked,
    hasPinSet,
    isAppLockEnabled,
    isBiometricEnabled,
    isBiometricAvailable,
    biometryType,
    lockTimeout,
    isCheckingAuth,
    lockApp,
    unlockApp,
    verifyPin,
    triggerBiometrics,
    refreshSecurityState,
  };

  return <AppLockContext.Provider value={value}>{children}</AppLockContext.Provider>;
};

export const useAppLock = (): AppLockContextType => {
  const context = useContext(AppLockContext);
  if (!context) {
    throw new Error('useAppLock must be used within an AppLockProvider');
  }
  return context;
};

export default AppLockContext;
