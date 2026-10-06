import React, { useState, useEffect, useCallback } from 'react';
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
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useNavigation, useIsFocused, NavigationProp } from '@react-navigation/native';
import { pick, types } from '@react-native-documents/picker';
import { RootStackParamList } from '../../app/navigation/navigation.types';
import { useAppTheme, THEME_OPTIONS } from '../../shared/hooks';
import { useAppLock } from './context/AppLockContext';
import { AuthService } from './services/authService';
import { VaultService } from './services/vaultService';
import { VaultDocumentItem, LockTimeoutOption } from './vault.types';
import { formatFileSize, formatDate, getFileExtension } from '../../shared/utils';

export const SecurityScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();
  const { themeColors, themeMode, setThemeMode, isDark } = useAppTheme();

  const {
    isAppLockEnabled,
    hasPinSet,
    isBiometricAvailable,
    isBiometricEnabled,
    biometryType,
    lockTimeout,
    lockApp,
    refreshSecurityState,
  } = useAppLock();

  // Vault Documents State
  const [vaultDocs, setVaultDocs] = useState<VaultDocumentItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoadingDocs, setIsLoadingDocs] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingMsg, setProcessingMsg] = useState<string>('');

  // PIN Setup Modal State
  const [isPinModalVisible, setIsPinModalVisible] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinConfirmInput, setPinConfirmInput] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');

  // Load vault documents
  const loadVaultDocs = useCallback(async () => {
    try {
      setIsLoadingDocs(true);
      const docs = await VaultService.getVaultDocuments();
      setVaultDocs(docs);
    } catch (error) {
      console.warn('SecurityScreen: Failed to load vault documents:', error);
    } finally {
      setIsLoadingDocs(false);
    }
  }, []);

  // Screen Focus / Lifecycle
  useEffect(() => {
    if (isFocused) {
      // Enable FLAG_SECURE while viewing vault
      VaultService.setWindowSecureFlag(true);
      loadVaultDocs();
      refreshSecurityState();
    }
  }, [isFocused, loadVaultDocs, refreshSecurityState]);

  // Handle Add Document to Vault
  const handleAddDocumentToVault = async () => {
    try {
      const results = await pick({
        type: [types.allFiles],
        mode: 'import',
      });

      if (!results || results.length === 0) return;

      const file = results[0];
      const sourceUri = file.uri;
      const fileName = file.name || `SecureDoc_${Date.now()}`;
      const fileSize = Number(file.size || 0);

      setIsProcessing(true);
      setProcessingMsg(`Encrypting "${fileName}" with AES-256-GCM...`);

      await VaultService.addToVault(sourceUri, fileName, fileSize);
      await loadVaultDocs();
      Alert.alert('Vault Secured', `"${fileName}" has been encrypted and moved to your offline vault.`);
    } catch (error: any) {
      if (!error?.message?.includes('User canceled') && error?.code !== 'DOCUMENT_PICKER_CANCELED') {
        Alert.alert('Encryption Error', error?.message || 'Failed to encrypt document.');
      }
    } finally {
      setIsProcessing(false);
      setProcessingMsg('');
    }
  };

  // Open & Decrypt Vault Document
  const handleOpenDocument = async (doc: VaultDocumentItem) => {
    try {
      setIsProcessing(true);
      setProcessingMsg(`Decrypting "${doc.name}"...`);

      const decrypted = await VaultService.openVaultDocument(doc);
      setIsProcessing(false);
      setProcessingMsg('');

      const ext = (doc.extension || getFileExtension(doc.name)).toLowerCase();

      if (ext === 'pdf') {
        navigation.navigate('DocumentViewer', {
          document: {
            id: doc.id,
            name: doc.name,
            uri: decrypted.decryptedUri,
            mimeType: 'application/pdf',
            extension: 'pdf',
            size: decrypted.decryptedSize,
            modifiedAt: Date.now(),
          },
        });
      } else {
        navigation.navigate('Editor', {
          documentId: doc.id,
          filePath: decrypted.decryptedPath,
          title: doc.name,
          document: {
            id: doc.id,
            name: doc.name,
            uri: decrypted.decryptedUri,
            mimeType: doc.mimeType || 'text/plain',
            extension: ext,
            size: decrypted.decryptedSize,
          },
        });
      }
    } catch (error: any) {
      setIsProcessing(false);
      setProcessingMsg('');
      Alert.alert('Decryption Failed', error?.message || 'Failed to decrypt document.');
    }
  };

  // Delete Document
  const handleDeleteDocument = (doc: VaultDocumentItem) => {
    Alert.alert(
      'Delete Encrypted File',
      `Permanently delete "${doc.name}" from your secure vault? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await VaultService.deleteVaultDocument(doc.id);
              await loadVaultDocs();
            } catch (error: any) {
              Alert.alert('Error', error?.message || 'Failed to delete file.');
            }
          },
        },
      ]
    );
  };

  // Toggle Favorite
  const handleToggleFavorite = async (docId: string) => {
    try {
      await VaultService.toggleVaultFavorite(docId);
      await loadVaultDocs();
    } catch (error: any) {
      console.warn('Failed to toggle favorite:', error);
    }
  };

  // Handle PIN Save
  const handleSavePin = async () => {
    if (pinInput.length < 4) {
      setPinError('PIN must be at least 4 digits');
      return;
    }
    if (pinInput !== pinConfirmInput) {
      setPinError('PINs do not match');
      return;
    }

    try {
      await AuthService.savePin(pinInput);
      await refreshSecurityState();
      setIsPinModalVisible(false);
      setPinInput('');
      setPinConfirmInput('');
      setPinError('');
      Alert.alert('Security PIN Set', 'Your security PIN has been updated and App Lock is active.');
    } catch (error: any) {
      setPinError(error?.message || 'Failed to set PIN');
    }
  };

  // Handle Remove PIN
  const handleRemovePin = async () => {
    Alert.alert(
      'Remove Security PIN',
      'Disabling PIN protection will disable App Lock for your vault. Proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await AuthService.removePin();
              await refreshSecurityState();
              Alert.alert('PIN Removed', 'App PIN protection has been removed.');
            } catch (error: any) {
              Alert.alert('Error', error?.message || 'Failed to remove PIN.');
            }
          },
        },
      ]
    );
  };

  // Toggle App Lock
  const handleToggleAppLock = async (enabled: boolean) => {
    if (enabled && !hasPinSet) {
      setIsPinModalVisible(true);
      return;
    }

    try {
      await AuthService.setAppLockEnabled(enabled);
      await refreshSecurityState();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to update app lock setting.');
    }
  };

  // Toggle Biometrics
  const handleToggleBiometrics = async (enabled: boolean) => {
    if (!isBiometricAvailable) return;

    try {
      if (enabled) {
        const result = await AuthService.authenticateBiometrics(
          `Confirm ${biometryType} to enable biometric unlock`
        );
        if (result.success) {
          await AuthService.setBiometricEnabled(true);
          await refreshSecurityState();
        }
      } else {
        await AuthService.setBiometricEnabled(false);
        await refreshSecurityState();
      }
    } catch (error: any) {
      Alert.alert('Biometric Error', error?.message || 'Failed to update biometrics.');
    }
  };

  // Test Biometrics
  const handleTestBiometrics = async () => {
    try {
      const result = await AuthService.authenticateBiometrics('Verify your identity');
      if (result.success) {
        Alert.alert('Verified', 'Biometric identity successfully verified.');
      } else {
        Alert.alert('Failed', result.error || 'Biometric authentication cancelled.');
      }
    } catch (error: any) {
      Alert.alert('Authentication Failed', error?.message || 'Biometric test failed.');
    }
  };

  // Change Timeout
  const handleChangeTimeout = async (timeout: LockTimeoutOption) => {
    try {
      await AuthService.setLockTimeout(timeout);
      await refreshSecurityState();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to set timeout.');
    }
  };

  const filteredDocs = vaultDocs.filter((doc) =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const timeoutOptions: { id: LockTimeoutOption; label: string }[] = [
    { id: 'immediately', label: 'Immediately' },
    { id: '1m', label: '1 min' },
    { id: '5m', label: '5 mins' },
    { id: '15m', label: '15 mins' },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header with Title and Quick Lock */}
        <View style={styles.topHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>
              Secure Document Vault
            </Text>
            <Text style={[styles.headerSub, { color: themeColors.textSecondary }]}>
              Hardware-backed AES-256-GCM encrypted storage.
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.lockNowButton, { backgroundColor: themeColors.primary }]}
            onPress={lockApp}
            activeOpacity={0.8}
          >
            <Text style={styles.lockNowText}>🔒 Lock Now</Text>
          </TouchableOpacity>
        </View>

        {/* VAULT DOCUMENTS CARD */}
        <View
          style={[
            styles.card,
            { backgroundColor: themeColors.card, borderColor: themeColors.border },
          ]}
        >
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={[styles.cardTitle, { color: themeColors.textPrimary }]}>
                📁 Protected Documents ({vaultDocs.length})
              </Text>
              <Text style={[styles.cardDesc, { color: themeColors.textMuted }]}>
                Encrypted at rest with unique IVs and GCM tags.
              </Text>
            </View>
          </View>

          {/* Add to Vault button */}
          <TouchableOpacity
            style={[styles.addVaultBtn, { backgroundColor: themeColors.primary }]}
            onPress={handleAddDocumentToVault}
            activeOpacity={0.8}
            disabled={isProcessing}
          >
            <Text style={styles.addVaultBtnText}>+ Add Document to Vault</Text>
          </TouchableOpacity>

          {/* Search Vault */}
          {vaultDocs.length > 0 && (
            <TextInput
              style={[
                styles.vaultSearchInput,
                {
                  backgroundColor: themeColors.inputBackground,
                  borderColor: themeColors.border,
                  color: themeColors.textPrimary,
                },
              ]}
              placeholder="Search vault documents..."
              placeholderTextColor={themeColors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          )}

          {/* Document List */}
          {isLoadingDocs ? (
            <ActivityIndicator style={{ paddingVertical: 20 }} color={themeColors.primary} />
          ) : filteredDocs.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🛡️</Text>
              <Text style={[styles.emptyTitle, { color: themeColors.textPrimary }]}>
                {vaultDocs.length === 0 ? 'Vault is Empty' : 'No matching documents'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: themeColors.textSecondary }]}>
                {vaultDocs.length === 0
                  ? 'Add confidential PDFs, TXT, or scanned files to protect them with AES-256 encryption.'
                  : 'Try a different search term.'}
              </Text>
            </View>
          ) : (
            <View style={styles.docsList}>
              {filteredDocs.map((doc) => {
                const ext = (doc.extension || 'bin').toUpperCase();
                return (
                  <View
                    key={doc.id}
                    style={[
                      styles.docItem,
                      {
                        backgroundColor: themeColors.cardSecondary,
                        borderColor: themeColors.border,
                      },
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.docInfoCol}
                      onPress={() => handleOpenDocument(doc)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.docHeaderLine}>
                        <View
                          style={[
                            styles.badgeExt,
                            {
                              backgroundColor:
                                ext === 'PDF' ? '#EF444420' : themeColors.primary + '20',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.badgeExtText,
                              {
                                color: ext === 'PDF' ? '#EF4444' : themeColors.primary,
                              },
                            ]}
                          >
                            {ext}
                          </Text>
                        </View>
                        <Text
                          style={[styles.docName, { color: themeColors.textPrimary }]}
                          numberOfLines={1}
                        >
                          {doc.name}
                        </Text>
                      </View>
                      <Text style={[styles.docMeta, { color: themeColors.textMuted }]}>
                        {formatFileSize(doc.originalSize || doc.encryptedSize)} • {formatDate(doc.updatedAt)}
                      </Text>
                    </TouchableOpacity>

                    <View style={styles.docActionsRow}>
                      <TouchableOpacity
                        style={styles.actionIconBtn}
                        onPress={() => handleToggleFavorite(doc.id)}
                      >
                        <Text style={styles.actionIconText}>
                          {doc.isFavorite ? '★' : '☆'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.actionIconBtn}
                        onPress={() => handleDeleteDocument(doc)}
                      >
                        <Text style={[styles.actionIconText, { color: themeColors.error }]}>
                          🗑️
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* APP LOCK & PIN CARD */}
        <View
          style={[
            styles.card,
            { backgroundColor: themeColors.card, borderColor: themeColors.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: themeColors.textPrimary }]}>
            🔐 App Lock & PIN
          </Text>
          <Text style={[styles.cardDesc, { color: themeColors.textMuted }]}>
            Require verification when UniversalDocs opens or resumes from background.
          </Text>

          <View style={styles.settingRow}>
            <View>
              <Text style={[styles.settingLabel, { color: themeColors.textPrimary }]}>
                Enable App Lock
              </Text>
              <Text style={[styles.settingSub, { color: themeColors.textMuted }]}>
                {hasPinSet ? 'PIN protection active' : 'Requires PIN setup'}
              </Text>
            </View>
            <Switch
              value={isAppLockEnabled && hasPinSet}
              onValueChange={handleToggleAppLock}
              trackColor={{ false: themeColors.border, true: themeColors.primary }}
              thumbColor={isAppLockEnabled && hasPinSet ? '#FFFFFF' : themeColors.textMuted}
            />
          </View>

          <View style={styles.pinConfigRow}>
            {hasPinSet ? (
              <View style={styles.pinBtnRow}>
                <TouchableOpacity
                  style={[styles.secondaryBtn, { backgroundColor: themeColors.cardSecondary }]}
                  onPress={() => {
                    setPinInput('');
                    setPinConfirmInput('');
                    setPinError('');
                    setIsPinModalVisible(true);
                  }}
                >
                  <Text style={[styles.secondaryBtnText, { color: themeColors.primary }]}>
                    Change PIN
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.secondaryBtn,
                    { backgroundColor: isDark ? '#7F1D1D' : '#FEE2E2' },
                  ]}
                  onPress={handleRemovePin}
                >
                  <Text style={[styles.secondaryBtnText, { color: themeColors.error }]}>
                    Remove PIN
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: themeColors.primary }]}
                onPress={() => {
                  setPinInput('');
                  setPinConfirmInput('');
                  setPinError('');
                  setIsPinModalVisible(true);
                }}
              >
                <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>
                  Configure Security PIN
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* BIOMETRIC LOCK CARD */}
        <View
          style={[
            styles.card,
            { backgroundColor: themeColors.card, borderColor: themeColors.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: themeColors.textPrimary }]}>
            👆 Biometric Lock
          </Text>
          <Text style={[styles.cardDesc, { color: themeColors.textMuted }]}>
            Sensor: {isBiometricAvailable ? biometryType : 'Not Available on this device'}
          </Text>

          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: themeColors.textPrimary }]}>
              Enable {biometryType !== 'None' ? biometryType : 'Biometric'} Unlock
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
                Test Biometric Sensor
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* AUTO-LOCK TIMEOUT CARD */}
        <View
          style={[
            styles.card,
            { backgroundColor: themeColors.card, borderColor: themeColors.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: themeColors.textPrimary }]}>
            ⏱️ Auto-Lock Timeout
          </Text>
          <Text style={[styles.cardDesc, { color: themeColors.textMuted }]}>
            Lock app automatically after background inactivity.
          </Text>

          <View style={styles.timeoutRow}>
            {timeoutOptions.map((opt) => {
              const isSelected = lockTimeout === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.timeoutChip,
                    {
                      backgroundColor: isSelected
                        ? themeColors.primary
                        : themeColors.cardSecondary,
                      borderColor: isSelected ? themeColors.primary : themeColors.border,
                    },
                  ]}
                  onPress={() => handleChangeTimeout(opt.id)}
                >
                  <Text
                    style={[
                      styles.timeoutChipText,
                      {
                        color: isSelected ? '#FFFFFF' : themeColors.textPrimary,
                        fontWeight: isSelected ? '700' : '500',
                      },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* THEMES & APPEARANCE CARD */}
        <View
          style={[
            styles.card,
            { backgroundColor: themeColors.card, borderColor: themeColors.border },
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
                      backgroundColor: isSelected
                        ? themeColors.cardSecondary
                        : themeColors.card,
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

        {/* PRIVACY & SECURITY ARCHITECTURE NOTICE */}
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
            🛡️ 100% Offline & Hardware-Backed Security
          </Text>
          <Text style={[styles.privacyText, { color: themeColors.textSecondary }]}>
            UniversalDocs utilizes Android Keystore hardware-backed AES-256-GCM encryption. Master
            encryption keys never leave the hardware module. Temporary viewer files are kept in
            private cache and strictly cleaned on lock.
          </Text>
        </View>
      </ScrollView>

      {/* PIN Setup Modal */}
      <Modal
        visible={isPinModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsPinModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: themeColors.card, borderColor: themeColors.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>
              {hasPinSet ? 'Change Security PIN' : 'Set Security PIN'}
            </Text>
            <Text style={[styles.modalDesc, { color: themeColors.textSecondary }]}>
              Enter a 4-6 digit numeric PIN to protect your vault.
            </Text>

            <TextInput
              style={[
                styles.modalInput,
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

            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: themeColors.inputBackground,
                  borderColor: themeColors.border,
                  color: themeColors.textPrimary,
                },
              ]}
              placeholder="Confirm PIN"
              placeholderTextColor={themeColors.textMuted}
              secureTextEntry
              keyboardType="numeric"
              maxLength={6}
              value={pinConfirmInput}
              onChangeText={setPinConfirmInput}
            />

            {pinError ? (
              <Text style={[styles.errorMsg, { color: themeColors.error }]}>{pinError}</Text>
            ) : null}

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: themeColors.cardSecondary }]}
                onPress={() => setIsPinModalVisible(false)}
              >
                <Text style={{ color: themeColors.textSecondary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: themeColors.primary }]}
                onPress={handleSavePin}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Save PIN</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Full-screen Processing Overlay (during encryption/decryption) */}
      {isProcessing && (
        <View style={styles.loadingOverlay}>
          <View
            style={[
              styles.loadingCard,
              { backgroundColor: themeColors.card, borderColor: themeColors.border },
            ]}
          >
            <ActivityIndicator size="large" color={themeColors.primary} />
            <Text style={[styles.loadingText, { color: themeColors.textPrimary }]}>
              {processingMsg}
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    padding: 16,
    paddingBottom: 36,
  },
  topHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  headerSub: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  lockNowButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  lockNowText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardDesc: {
    fontSize: 13,
    marginTop: 2,
  },
  addVaultBtn: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  addVaultBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  vaultSearchInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    marginBottom: 12,
  },
  emptyContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 18,
  },
  docsList: {
    gap: 8,
  },
  docItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  docInfoCol: {
    flex: 1,
    marginRight: 8,
  },
  docHeaderLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgeExt: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeExtText: {
    fontSize: 10,
    fontWeight: '800',
  },
  docName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  docMeta: {
    fontSize: 12,
    marginTop: 4,
  },
  docActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionIconBtn: {
    padding: 8,
  },
  actionIconText: {
    fontSize: 18,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  settingSub: {
    fontSize: 12,
    marginTop: 2,
  },
  pinConfigRow: {
    marginTop: 8,
  },
  pinBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionBtn: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  timeoutRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  timeoutChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  timeoutChipText: {
    fontSize: 12,
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
  privacyNote: {
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalDesc: {
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlign: 'center',
    letterSpacing: 6,
    marginBottom: 12,
  },
  errorMsg: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  loadingCard: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default SecurityScreen;
