import { NativeModules, Platform } from 'react-native';
import { VaultRepository } from '../../../core/database/repositories/vaultRepository';
import { SecurityError } from '../../../core/errors/AppError';
import { getFileExtension, getMimeTypeFromExtension } from '../../../shared/utils';
import {
  VaultDocumentItem,
  EncryptedFileResult,
  DecryptedFileResult,
} from '../vault.types';

const { VaultEncryptionModule } = NativeModules;

export class VaultService {
  private static checkNativeModule(): void {
    if (!VaultEncryptionModule && Platform.OS === 'android') {
      throw new SecurityError('VaultEncryptionModule is not available on this platform.');
    }
  }

  /**
   * Encrypts a document file using native AES-256-GCM and records it in the vault database.
   */
  static async addToVault(
    sourceUriOrPath: string,
    fileName: string,
    originalSize: number = 0,
    mimeType?: string,
    extension?: string
  ): Promise<VaultDocumentItem> {
    this.checkNativeModule();

    const cleanExt = (extension || getFileExtension(fileName) || 'bin').toLowerCase().replace('.', '');
    const cleanMime = mimeType || getMimeTypeFromExtension(cleanExt);
    const now = Date.now();
    const docId = `vdoc_${now}_${Math.random().toString(36).substring(2, 8)}`;

    try {
      const encryptResult: EncryptedFileResult = await VaultEncryptionModule.encryptFile(
        sourceUriOrPath,
        fileName
      );

      const vaultDoc: VaultDocumentItem = {
        id: docId,
        name: fileName,
        encryptedPath: encryptResult.encryptedPath,
        mimeType: cleanMime,
        extension: cleanExt,
        originalSize: originalSize || encryptResult.encryptedSize,
        encryptedSize: encryptResult.encryptedSize,
        createdAt: now,
        updatedAt: now,
        lastOpenedAt: null,
        isFavorite: false,
      };

      await VaultRepository.insert(vaultDoc);
      return vaultDoc;
    } catch (error: any) {
      throw new SecurityError(`Failed to encrypt and store document in vault: ${error?.message || error}`, error);
    }
  }

  /**
   * Decrypts an encrypted vault document on-demand to private app cache for viewing.
   */
  static async openVaultDocument(doc: VaultDocumentItem): Promise<DecryptedFileResult> {
    this.checkNativeModule();

    try {
      const decryptResult: DecryptedFileResult = await VaultEncryptionModule.decryptFile(
        doc.encryptedPath,
        doc.name
      );

      await VaultRepository.updateLastOpenedAt(doc.id, Date.now());
      return decryptResult;
    } catch (error: any) {
      throw new SecurityError(`Failed to decrypt vault document: ${error?.message || error}`, error);
    }
  }

  /**
   * Deletes a vault document from disk and the database.
   */
  static async deleteVaultDocument(id: string): Promise<void> {
    this.checkNativeModule();

    try {
      const doc = await VaultRepository.findById(id);
      if (doc) {
        await VaultEncryptionModule.deleteVaultFile(doc.encryptedPath);
        await VaultRepository.delete(id);
      }
    } catch (error: any) {
      throw new SecurityError(`Failed to delete vault document: ${error?.message || error}`, error);
    }
  }

  /**
   * Purges all temporary decrypted files in private cache when vault is locked or app backgrounded.
   */
  static async lockVaultAndClean(): Promise<number> {
    if (!VaultEncryptionModule) return 0;

    try {
      const count: number = await VaultEncryptionModule.cleanDecryptedFiles();
      return count;
    } catch (error: any) {
      console.warn('VaultService: Failed to clean decrypted files on lock:', error);
      return 0;
    }
  }

  /**
   * Cleans a specific temporary decrypted file after viewer session completes.
   */
  static async cleanDecryptedSessionFile(filePath: string): Promise<boolean> {
    if (!VaultEncryptionModule) return false;

    try {
      const cleaned: boolean = await VaultEncryptionModule.cleanDecryptedFile(filePath);
      return cleaned;
    } catch (error: any) {
      console.warn('VaultService: Failed to clean session decrypted file:', error);
      return false;
    }
  }

  /**
   * Controls WindowManager.LayoutParams.FLAG_SECURE to hide screen content and prevent screenshots.
   */
  static async setWindowSecureFlag(enable: boolean): Promise<boolean> {
    if (!VaultEncryptionModule) return false;

    try {
      const result: boolean = await VaultEncryptionModule.setSecureFlag(enable);
      return result;
    } catch (error: any) {
      console.warn('VaultService: Failed to set secure window flag:', error);
      return false;
    }
  }

  /**
   * Fetches all secured documents from the vault database.
   */
  static async getVaultDocuments(): Promise<VaultDocumentItem[]> {
    return await VaultRepository.getAll();
  }

  /**
   * Searches documents within the vault database.
   */
  static async searchVaultDocuments(query: string): Promise<VaultDocumentItem[]> {
    return await VaultRepository.search(query);
  }

  /**
   * Toggles the favorite status of a vault document.
   */
  static async toggleVaultFavorite(id: string): Promise<boolean> {
    return await VaultRepository.toggleFavorite(id);
  }
}

export default VaultService;
