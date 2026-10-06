/**
 * UniversalDocs - Vault & Security Types
 * Strongly typed models for encrypted vault storage and application security settings.
 */

export interface VaultDocumentItem {
  id: string;
  name: string;
  encryptedPath: string;
  mimeType: string;
  extension: string;
  originalSize: number;
  encryptedSize: number;
  createdAt: number;
  updatedAt: number;
  lastOpenedAt?: number | null;
  isFavorite?: boolean;
}

export type LockTimeoutOption = 'immediately' | '1m' | '5m' | '15m';

export interface SecuritySettingsState {
  hasPinSet: boolean;
  isBiometricAvailable: boolean;
  isBiometricEnabled: boolean;
  biometryType: string;
  lockTimeout: LockTimeoutOption;
  isAppLockEnabled: boolean;
}

export interface EncryptedFileResult {
  encryptedPath: string;
  encryptedUri: string;
  fileName: string;
  encryptedSize: number;
}

export interface DecryptedFileResult {
  decryptedPath: string;
  decryptedUri: string;
  fileName: string;
  decryptedSize: number;
}
