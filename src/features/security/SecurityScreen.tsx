import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import ReactNativeBiometrics, { BiometryType } from 'react-native-biometrics';
import { SecureStorage } from '../../core/storage/secureStorage';
import { STORAGE_KEYS } from '../../shared/constants';
import { useAppTheme, ThemeMode, THEME_OPTIONS } from '../../shared/hooks';

export const SecurityScreen: React.FC = () => {
  const { themeColors, themeMode, setThemeMode, isDark } = useAppTheme();

  const [biometryType, setBiometryType] = useState<BiometryType | 'None'>('None');
  const [isBiometricAvailable, setIsBiometricAvailable] = useState<boolean>(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState<boolean>(false);

  const [hasPinSet, setHasPinSet] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [isSettingPin, setIsSettingPin] = useState<boolean>(false);

  const rnBiometrics = new ReactNativeBiometrics();

  useEffect(() => {
    async function checkSecurityStatus() {
      try {
        const { available, biometryType: detectedType } = await rnBiometrics.isSensorAvailable();
        setIsBiometricAvailable(available);
        if (available && detectedType) {
          setBiometryType(detectedType);
        }

        const savedPin = await SecureStorage.getSecureItem(STORAGE_KEYS.AUTH_PIN);
        setHasPinSet(!!savedPin);

        const bioPref = await SecureStorage.getSecureItem(STORAGE_KEYS.BIOMETRIC_ENABLED);
        setIsBiometricEnabled(bioPref === 'true');
      } catch (error) {
        console.error('Error checking security status:', error);
      }
    }

    checkSecurityStatus();
  }, []);

  const handleSavePin = async () => {
    if (pinInput.length < 4) {
      Alert.alert('PIN Error', 'PIN must be at least 4 digits.');
      return;
    }

    try {
      await SecureStorage.setSecureItem(STORAGE_KEYS.AUTH_PIN, pinInput);
      setHasPinSet(true);
      setPinInput('');
      setIsSettingPin(false);
      Alert.alert('Success', 'Security PIN saved successfully.');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to set PIN.');
    }
  };

  const handleRemovePin = async () => {
    Alert.alert('Remove PIN', 'Are you sure you want to disable PIN lock?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await SecureStorage.removeSecureItem(STORAGE_KEYS.AUTH_PIN);
          setHasPinSet(false);
          Alert.alert('PIN Removed', 'App PIN protection has been disabled.');
        },
      },
    ]);
  };

  const handleToggleBiometrics = async (enabled: boolean) => {
    if (!isBiometricAvailable) return;

    try {
      if (enabled) {
        const result = await rnBiometrics.simplePrompt({
          promptMessage: 'Confirm fingerprint or face to enable biometric unlock',
        });
        if (result.success) {
          await SecureStorage.setSecureItem(STORAGE_KEYS.BIOMETRIC_ENABLED, 'true');
          setIsBiometricEnabled(true);
        } else {
          setIsBiometricEnabled(false);
        }
      } else {
        await SecureStorage.removeSecureItem(STORAGE_KEYS.BIOMETRIC_ENABLED);
        setIsBiometricEnabled(false);
      }
    } catch (error: any) {
      Alert.alert('Biometric Error', error?.message || 'Failed to authenticate biometrics.');
      setIsBiometricEnabled(false);
    }
  };

  const handleTestBiometrics = async () => {
    try {
      const result = await rnBiometrics.simplePrompt({
        promptMessage: 'Verify your identity',
      });
      if (result.success) {
        Alert.alert('Verified', 'Biometric authentication successful!');
      } else {
        Alert.alert('Cancelled', 'Biometric authentication was cancelled.');
      }
    } catch (error: any) {
      Alert.alert('Authentication Failed', error?.message || 'Biometrics failed.');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>
          Security & Vault
        </Text>
        <Text style={[styles.headerSub, { color: themeColors.textSecondary }]}>
          Protect your offline documents with local biometrics and PIN encryption.
        </Text>

        {/* Appearance & Themes Section */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: themeColors.card,
              borderColor: themeColors.border,
            },
          ]}
        >
          <Text style={[styles.cardTitle, { color: themeColors.textPrimary }]}>
            🎨 App Appearance & Theme
          </Text>
          <Text style={[styles.cardDesc, { color: themeColors.textMuted }]}>
            Select your preferred display theme. All themes support offline viewing.
          </Text>

          <View style={styles.themeOptionsGrid}>
            {THEME_OPTIONS.map((opt) => {
              const isSelected = themeMode === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.themeOptionCard,
                    {
                      backgroundColor: isSelected ? themeColors.cardSecondary : themeColors.card,
                      borderColor: isSelected ? themeColors.primary : themeColors.border,
                    },
                  ]}
                  onPress={() => setThemeMode(opt.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.themeCardHeader}>
                    <View
                      style={[
                        styles.themeColorDot,
                        { backgroundColor: opt.colorPreview },
                      ]}
                    />
                    {isSelected && (
                      <Text style={[styles.themeCheckmark, { color: themeColors.primary }]}>
                        ✓
                      </Text>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.themeName,
                      {
                        color: isSelected ? themeColors.primary : themeColors.textPrimary,
                        fontWeight: isSelected ? '700' : '500',
                      },
                    ]}
                  >
                    {opt.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Biometrics Card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: themeColors.card,
              borderColor: themeColors.border,
            },
          ]}
        >
          <Text style={[styles.cardTitle, { color: themeColors.textPrimary }]}>
            Biometric Lock
          </Text>
          <Text style={[styles.cardDesc, { color: themeColors.textMuted }]}>
            Sensor: {isBiometricAvailable ? biometryType : 'Not Available on this device'}
          </Text>

          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: themeColors.textPrimary }]}>
              Enable {biometryType} unlock
            </Text>
            <Switch
              disabled={!isBiometricAvailable}
              value={isBiometricEnabled}
              onValueChange={handleToggleBiometrics}
              trackColor={{ false: themeColors.border, true: themeColors.primary }}
              thumbColor={isBiometricEnabled ? '#FFFFFF' : themeColors.textMuted}
            />
          </View>

          {isBiometricAvailable && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: themeColors.cardSecondary }]}
              onPress={handleTestBiometrics}
              activeOpacity={0.8}
            >
              <Text style={[styles.actionBtnText, { color: themeColors.primary }]}>
                Test {biometryType} Authentication
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* PIN Security Card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: themeColors.card,
              borderColor: themeColors.border,
            },
          ]}
        >
          <Text style={[styles.cardTitle, { color: themeColors.textPrimary }]}>
            App PIN Protection
          </Text>
          <Text style={[styles.cardDesc, { color: themeColors.textMuted }]}>
            Status: {hasPinSet ? '● Active' : '○ Not Configured'}
          </Text>

          {isSettingPin ? (
            <View style={styles.pinForm}>
              <TextInput
                style={[
                  styles.pinInput,
                  {
                    backgroundColor: themeColors.inputBackground,
                    borderColor: themeColors.border,
                    color: themeColors.textPrimary,
                  },
                ]}
                placeholder="Enter 4-6 digit PIN"
                placeholderTextColor={themeColors.textMuted}
                secureTextEntry
                keyboardType="numeric"
                maxLength={6}
                value={pinInput}
                onChangeText={setPinInput}
              />
              <View style={styles.pinBtnRow}>
                <TouchableOpacity
                  style={[styles.smallBtn, { backgroundColor: themeColors.cardSecondary }]}
                  onPress={() => {
                    setIsSettingPin(false);
                    setPinInput('');
                  }}
                >
                  <Text style={{ color: themeColors.textSecondary, fontWeight: '600' }}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.smallBtn, { backgroundColor: themeColors.primary }]}
                  onPress={handleSavePin}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Save PIN</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.pinActions}>
              {hasPinSet ? (
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    {
                      backgroundColor: isDark ? '#7F1D1D' : '#FEE2E2',
                    },
                  ]}
                  onPress={handleRemovePin}
                >
                  <Text style={[styles.actionBtnText, { color: themeColors.error }]}>
                    Disable PIN
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: themeColors.primary }]}
                  onPress={() => setIsSettingPin(true)}
                >
                  <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>
                    Set Security PIN
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Privacy Note */}
        <View
          style={[
            styles.privacyNote,
            {
              backgroundColor: themeColors.cardSecondary,
              borderColor: themeColors.border,
              borderWidth: 1,
            },
          ]}
        >
          <Text style={[styles.privacyTitle, { color: themeColors.textPrimary }]}>
            🔒 100% Local & Offline
          </Text>
          <Text style={[styles.privacyText, { color: themeColors.textSecondary }]}>
            All documents, authentication keys, and credentials are stored exclusively on this device
            using Android Keystore / iOS Keychain. No data is sent to external servers.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    padding: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  headerSub: {
    fontSize: 13,
    marginTop: 4,
    marginBottom: 20,
    lineHeight: 18,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardDesc: {
    fontSize: 13,
    marginTop: 2,
    marginBottom: 14,
  },
  themeOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  themeOptionCard: {
    width: '48%',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1.5,
  },
  themeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  themeColorDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  themeCheckmark: {
    fontSize: 14,
    fontWeight: '800',
  },
  themeName: {
    fontSize: 13,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  actionBtn: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  pinForm: {
    marginTop: 8,
  },
  pinInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: 12,
  },
  pinBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  smallBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  pinActions: {
    marginTop: 4,
  },
  privacyNote: {
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 24,
  },
  privacyTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  privacyText: {
    fontSize: 13,
    lineHeight: 18,
  },
});

export default SecurityScreen;
