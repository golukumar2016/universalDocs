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
import { colors } from '../../shared/theme';

export const SecurityScreen: React.FC = () => {
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

  const handleToggleBiometrics = async (value: boolean) => {
    try {
      if (value) {
        const result = await rnBiometrics.simplePrompt({
          promptMessage: 'Confirm fingerprint or face to enable biometric lock',
        });
        if (result.success) {
          await SecureStorage.setSecureItem(STORAGE_KEYS.BIOMETRIC_ENABLED, 'true');
          setIsBiometricEnabled(true);
          Alert.alert('Success', 'Biometric lock enabled.');
        } else {
          setIsBiometricEnabled(false);
        }
      } else {
        await SecureStorage.setSecureItem(STORAGE_KEYS.BIOMETRIC_ENABLED, 'false');
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
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.headerTitle}>Security & Vault</Text>
        <Text style={styles.headerSub}>
          Protect your offline documents with local biometrics and PIN encryption.
        </Text>

        {/* Biometrics Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Biometric Lock</Text>
          <Text style={styles.cardDesc}>
            Sensor: {isBiometricAvailable ? biometryType : 'Not Available on this device'}
          </Text>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Enable {biometryType} unlock</Text>
            <Switch
              disabled={!isBiometricAvailable}
              value={isBiometricEnabled}
              onValueChange={handleToggleBiometrics}
              trackColor={{ false: '#E2E8F0', true: colors.primary }}
            />
          </View>

          {isBiometricAvailable && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleTestBiometrics}
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnText}>Test {biometryType} Authentication</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* PIN Security Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>App PIN Protection</Text>
          <Text style={styles.cardDesc}>
            Status: {hasPinSet ? '● Active' : '○ Not Configured'}
          </Text>

          {isSettingPin ? (
            <View style={styles.pinForm}>
              <TextInput
                style={styles.pinInput}
                placeholder="Enter 4-6 digit PIN"
                placeholderTextColor="#94A3B8"
                secureTextEntry
                keyboardType="numeric"
                maxLength={6}
                value={pinInput}
                onChangeText={setPinInput}
              />
              <View style={styles.pinBtnRow}>
                <TouchableOpacity
                  style={[styles.smallBtn, { backgroundColor: '#E2E8F0' }]}
                  onPress={() => {
                    setIsSettingPin(false);
                    setPinInput('');
                  }}
                >
                  <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.smallBtn, { backgroundColor: colors.primary }]}
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
                  style={[styles.actionBtn, { backgroundColor: '#FEE2E2' }]}
                  onPress={handleRemovePin}
                >
                  <Text style={[styles.actionBtnText, { color: colors.error }]}>Disable PIN</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setIsSettingPin(true)}
                >
                  <Text style={styles.actionBtnText}>Set Security PIN</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Privacy Note */}
        <View style={styles.privacyNote}>
          <Text style={styles.privacyTitle}>🔒 100% Local & Offline</Text>
          <Text style={styles.privacyText}>
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
    backgroundColor: '#F8FAFC',
  },
  container: {
    padding: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSub: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 20,
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cardDesc: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: 14,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  settingLabel: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  actionBtn: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  pinForm: {
    marginTop: 8,
  },
  pinInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlign: 'center',
    letterSpacing: 8,
    color: colors.textPrimary,
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
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  privacyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  privacyText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});

export default SecurityScreen;
