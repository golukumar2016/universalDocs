import { NativeModules } from 'react-native';
import { VaultService } from '../../src/features/security/services/vaultService';
import { VaultRepository } from '../../src/core/database/repositories/vaultRepository';

describe('VaultService - Native Encryption Bridge & Vault Orchestration', () => {
  afterEach(async () => {
    const all = await VaultRepository.getAll();
    for (const d of all) {
      await VaultRepository.delete(d.id);
    }
    jest.clearAllMocks();
  });

  it('encrypts and adds document to vault using native AES-256-GCM', async () => {
    const doc = await VaultService.addToVault(
      '/mock/storage/Download/Financial_Report.pdf',
      'Financial_Report.pdf',
      500000
    );

    expect(doc).toBeDefined();
    expect(doc.name).toBe('Financial_Report.pdf');
    expect(doc.extension).toBe('pdf');
    expect(doc.mimeType).toBe('application/pdf');
    expect(NativeModules.VaultEncryptionModule.encryptFile).toHaveBeenCalledWith(
      '/mock/storage/Download/Financial_Report.pdf',
      'Financial_Report.pdf'
    );

    // Should be recorded in repository
    const found = await VaultRepository.findById(doc.id);
    expect(found).not.toBeNull();
    expect(found?.name).toBe('Financial_Report.pdf');
  });

  it('decrypts vault document on-demand to private cache for viewing', async () => {
    const doc = await VaultService.addToVault(
      '/mock/storage/Download/Secret.txt',
      'Secret.txt',
      1200
    );

    const decrypted = await VaultService.openVaultDocument(doc);
    expect(decrypted).toBeDefined();
    expect(decrypted.decryptedPath).toContain('temp_Secret.txt');
    expect(decrypted.decryptedUri).toContain('file://');
    expect(NativeModules.VaultEncryptionModule.decryptFile).toHaveBeenCalledWith(
      doc.encryptedPath,
      'Secret.txt'
    );

    // Should update last opened
    const updated = await VaultRepository.findById(doc.id);
    expect(updated?.lastOpenedAt).not.toBeNull();
  });

  it('deletes vault document from both encrypted storage and database', async () => {
    const doc = await VaultService.addToVault(
      '/mock/storage/Doc.pdf',
      'Doc.pdf',
      5000
    );

    await VaultService.deleteVaultDocument(doc.id);
    expect(NativeModules.VaultEncryptionModule.deleteVaultFile).toHaveBeenCalledWith(
      doc.encryptedPath
    );

    const check = await VaultRepository.findById(doc.id);
    expect(check).toBeNull();
  });

  it('purges all temporary decrypted files on vault lock', async () => {
    const deletedCount = await VaultService.lockVaultAndClean();
    expect(deletedCount).toBe(2);
    expect(NativeModules.VaultEncryptionModule.cleanDecryptedFiles).toHaveBeenCalled();
  });

  it('cleans specific decrypted session file', async () => {
    const result = await VaultService.cleanDecryptedSessionFile('/mock/cache/vault_decrypted/temp_doc.pdf');
    expect(result).toBe(true);
    expect(NativeModules.VaultEncryptionModule.cleanDecryptedFile).toHaveBeenCalledWith(
      '/mock/cache/vault_decrypted/temp_doc.pdf'
    );
  });

  it('sets WindowManager FLAG_SECURE to prevent screenshots and task switcher previews', async () => {
    const result = await VaultService.setWindowSecureFlag(true);
    expect(result).toBe(true);
    expect(NativeModules.VaultEncryptionModule.setSecureFlag).toHaveBeenCalledWith(true);
  });

  it('searches and toggles favorite status of vault items', async () => {
    const d1 = await VaultService.addToVault('/mock/A.pdf', 'Alpha.pdf', 100);
    const d2 = await VaultService.addToVault('/mock/B.pdf', 'Beta.pdf', 200);

    const searchRes = await VaultService.searchVaultDocuments('alpha');
    expect(searchRes.length).toBe(1);
    expect(searchRes[0].name).toBe('Alpha.pdf');

    const favStatus = await VaultService.toggleVaultFavorite(d1.id);
    expect(favStatus).toBe(true);
  });
});
