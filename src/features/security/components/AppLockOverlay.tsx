import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  StatusBar,
} from 'react-native';
import { useAppLock } from '../context/AppLockContext';
import { AuthService } from '../services/authService';
import { useAppTheme } from '../../../shared/hooks';

export const AppLockOverlay: React.FC = () => {
  const { isLocked, isBiometricEnabled, biometryType, verifyPin, triggerBiometrics } =
    useAppLock();
  const { themeColors, isDark } = useAppTheme();

  const [pin, setPin] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isLockedOut, setIsLockedOut] = useState<boolean>(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Check lockout on mount and when locked status changes
  const checkLockout = useCallback(async () => {
    const lockout = await AuthService.getLockoutState();
    if (lockout.isLockedOut) {
      setIsLockedOut(true);
      setRemainingSeconds(lockout.remainingSeconds);
      setErrorMessage(`Too many failed attempts. Wait ${lockout.remainingSeconds}s.`);
    } else {
      setIsLockedOut(false);
      setRemainingSeconds(0);
    }
  }, []);

  useEffect(() => {
    if (isLocked) {
      setPin('');
      setErrorMessage('');
      checkLockout();
    }
  }, [isLocked, checkLockout]);

  // Lockout countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isLockedOut && remainingSeconds > 0) {
      timer = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            setIsLockedOut(false);
            setErrorMessage('');
            return 0;
          }
          const nextSec = prev - 1;
          setErrorMessage(`Too many failed attempts. Wait ${nextSec}s.`);
          return nextSec;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isLockedOut, remainingSeconds]);

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleKeyPress = async (digit: string) => {
    if (isLockedOut || isVerifying || pin.length >= 6) return;

    const newPin = pin + digit;
    setPin(newPin);
    setErrorMessage('');

    // If PIN reaches standard length (at least 4 digits, check if complete or user submits)
    // Most devices use 4 or 6 digit PINs. If length reaches 4, attempt check:
    if (newPin.length >= 4) {
      setIsVerifying(true);
      try {
        const result = await verifyPin(newPin);
        if (result.success) {
          setPin('');
          setErrorMessage('');
        } else {
          // If 4 digits failed, allow user to continue typing up to 6 digits unless locked out
          if (newPin.length === 6 || result.isLockedOut) {
            triggerShake();
            setPin('');
            if (result.isLockedOut) {
              setIsLockedOut(true);
              setRemainingSeconds(result.remainingSeconds || 30);
              setErrorMessage(`Too many failed attempts. Wait ${result.remainingSeconds || 30}s.`);
            } else if (result.attemptsLeft !== undefined) {
              setErrorMessage(`Incorrect PIN. ${result.attemptsLeft} attempts remaining.`);
            } else {
              setErrorMessage('Incorrect PIN. Please try again.');
            }
          }
        }
      } catch (err: any) {
        setErrorMessage(err?.message || 'Authentication error');
      } finally {
        setIsVerifying(false);
      }
    }
  };

  const handleDelete = () => {
    if (isLockedOut || isVerifying || pin.length === 0) return;
    setPin((prev) => prev.slice(0, -1));
    setErrorMessage('');
  };

  const handleBiometricPress = async () => {
    if (isLockedOut || isVerifying) return;
    try {
      const success = await triggerBiometrics();
      if (!success) {
        // Biometric canceled or failed, fallback to PIN is immediate
      }
    } catch {
      // Ignore
    }
  };

  if (!isLocked) {
    return null;
  }

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <SafeAreaView
      style={[
        styles.overlayContainer,
        { backgroundColor: isDark ? '#0B0F19' : themeColors.background },
      ]}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <View style={styles.headerContainer}>
        <View style={[styles.shieldBadge, { backgroundColor: themeColors.primary + '20' }]}>
          <Text style={styles.shieldIcon}>🔒</Text>
        </View>
        <Text style={[styles.title, { color: themeColors.textPrimary }]}>
          UniversalDocs Locked
        </Text>
        <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
          Enter your security PIN to unlock your vault
        </Text>
      </View>

      {/* Animated PIN Dots */}
      <Animated.View
        style={[
          styles.dotsContainer,
          { transform: [{ translateX: shakeAnim }] },
        ]}
      >
        {[0, 1, 2, 3].map((index) => {
          const filled = pin.length > index;
          return (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  borderColor: themeColors.primary,
                  backgroundColor: filled ? themeColors.primary : 'transparent',
                },
              ]}
            />
          );
        })}
      </Animated.View>

      {/* Error or Status Message */}
      <View style={styles.messageContainer}>
        {errorMessage ? (
          <Text style={[styles.errorText, { color: themeColors.error }]}>
            {errorMessage}
          </Text>
        ) : (
          <Text style={[styles.hintText, { color: themeColors.textMuted }]}>
            Offline Hardware-Backed Security
          </Text>
        )}
      </View>

      {/* Number Keypad */}
      <View style={styles.keypadContainer}>
        <View style={styles.keypadRow}>
          {digits.slice(0, 3).map((num) => (
            <TouchableOpacity
              key={num}
              style={[
                styles.keypadButton,
                {
                  backgroundColor: isDark ? '#1F2937' : '#F3F4F6',
                  opacity: isLockedOut ? 0.4 : 1,
                },
              ]}
              disabled={isLockedOut}
              onPress={() => handleKeyPress(num)}
              activeOpacity={0.6}
            >
              <Text style={[styles.keypadDigit, { color: themeColors.textPrimary }]}>
                {num}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.keypadRow}>
          {digits.slice(3, 6).map((num) => (
            <TouchableOpacity
              key={num}
              style={[
                styles.keypadButton,
                {
                  backgroundColor: isDark ? '#1F2937' : '#F3F4F6',
                  opacity: isLockedOut ? 0.4 : 1,
                },
              ]}
              disabled={isLockedOut}
              onPress={() => handleKeyPress(num)}
              activeOpacity={0.6}
            >
              <Text style={[styles.keypadDigit, { color: themeColors.textPrimary }]}>
                {num}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.keypadRow}>
          {digits.slice(6, 9).map((num) => (
            <TouchableOpacity
              key={num}
              style={[
                styles.keypadButton,
                {
                  backgroundColor: isDark ? '#1F2937' : '#F3F4F6',
                  opacity: isLockedOut ? 0.4 : 1,
                },
              ]}
              disabled={isLockedOut}
              onPress={() => handleKeyPress(num)}
              activeOpacity={0.6}
            >
              <Text style={[styles.keypadDigit, { color: themeColors.textPrimary }]}>
                {num}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.keypadRow}>
          {/* Biometrics button (bottom left) */}
          {isBiometricEnabled ? (
            <TouchableOpacity
              style={[
                styles.keypadButton,
                {
                  backgroundColor: themeColors.primary + '15',
                  opacity: isLockedOut ? 0.4 : 1,
                },
              ]}
              disabled={isLockedOut}
              onPress={handleBiometricPress}
              activeOpacity={0.6}
            >
              <Text style={styles.bioIcon}>
                {biometryType === 'FaceID' || biometryType === 'Face' ? '👤' : '👆'}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.keypadButtonEmpty} />
          )}

          {/* Zero digit */}
          <TouchableOpacity
            style={[
              styles.keypadButton,
              {
                backgroundColor: isDark ? '#1F2937' : '#F3F4F6',
                opacity: isLockedOut ? 0.4 : 1,
              },
            ]}
            disabled={isLockedOut}
            onPress={() => handleKeyPress('0')}
            activeOpacity={0.6}
          >
            <Text style={[styles.keypadDigit, { color: themeColors.textPrimary }]}>
              0
            </Text>
          </TouchableOpacity>

          {/* Delete button (bottom right) */}
          <TouchableOpacity
            style={[
              styles.keypadButton,
              {
                backgroundColor: isDark ? '#1F2937' : '#F3F4F6',
                opacity: isLockedOut || pin.length === 0 ? 0.4 : 1,
              },
            ]}
            disabled={isLockedOut || pin.length === 0}
            onPress={handleDelete}
            activeOpacity={0.6}
          >
            <Text style={[styles.keypadDigit, { color: themeColors.textPrimary }]}>
              ⌫
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999999,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 32,
    elevation: 24,
  },
  headerContainer: {
    alignItems: 'center',
    marginTop: 24,
    paddingHorizontal: 24,
  },
  shieldBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  shieldIcon: {
    fontSize: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
    gap: 20,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
  },
  messageContainer: {
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  hintText: {
    fontSize: 12,
    textAlign: 'center',
  },
  keypadContainer: {
    width: '100%',
    maxWidth: 320,
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 16,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  keypadButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keypadButtonEmpty: {
    width: 72,
    height: 72,
  },
  keypadDigit: {
    fontSize: 26,
    fontWeight: '600',
  },
  bioIcon: {
    fontSize: 28,
  },
});

export default AppLockOverlay;
