import { VaultRepository } from '../../src/core/database/repositories/vaultRepository';
import { DocumentRepository } from '../../src/core/database/repositories/documentRepository';
import { VaultDocumentItem } from '../../src/features/security/vault.types';

describe('VaultRepository - Encrypted Document Persistence & Isolation', () => {
  const sampleDoc1: VaultDocumentItem = {
    id: 'vdoc_001',
    name: 'Confidential_Contract.pdf',
    encryptedPath: '/mock/files/UniversalDocs/Vault/Confidential_Contract.pdf.enc',
    mimeType: 'application/pdf',
    extension: 'pdf',
    originalSize: 2048500,
    encryptedSize: 2048548,
    createdAt: 1000,
    updatedAt: 1000,
    lastOpenedAt: null,
    isFavorite: false,
  };

  const sampleDoc2: VaultDocumentItem = {
    id: 'vdoc_002',
    name: 'Private_Notes.txt',
    encryptedPath: '/mock/files/UniversalDocs/Vault/Private_Notes.txt.enc',
    mimeType: 'text/plain',
    extension: 'txt',
    originalSize: 1024,
    encryptedSize: 1072,
    createdAt: 2000,
    updatedAt: 2000,
    lastOpenedAt: null,
    isFavorite: true,
  };

  beforeEach(async () => {
    await VaultRepository.insert(sampleDoc1);
    await VaultRepository.insert(sampleDoc2);
  });

  afterEach(async () => {
    await VaultRepository.delete('vdoc_001');
    await VaultRepository.delete('vdoc_002');
  });

  it('inserts and retrieves vault documents by ID', async () => {
    const doc = await VaultRepository.findById('vdoc_001');
    expect(doc).not.toBeNull();
    expect(doc?.name).toBe('Confidential_Contract.pdf');
    expect(doc?.encryptedPath).toBe('/mock/files/UniversalDocs/Vault/Confidential_Contract.pdf.enc');
    expect(doc?.originalSize).toBe(2048500);
    expect(doc?.isFavorite).toBe(false);
  });

  it('retrieves all vault documents ordered by updatedAt DESC', async () => {
    const all = await VaultRepository.getAll();
    expect(all.length).toBeGreaterThanOrEqual(2);
    expect(all[0].id).toBe('vdoc_002'); // newer updatedAt
    expect(all[1].id).toBe('vdoc_001');
  });

  it('searches vault documents by substring query', async () => {
    const matches = await VaultRepository.search('contract');
    expect(matches.length).toBe(1);
    expect(matches[0].name).toBe('Confidential_Contract.pdf');

    const empty = await VaultRepository.search('NonExistentTerm');
    expect(empty.length).toBe(0);
  });

  it('updates lastOpenedAt timestamp on document open', async () => {
    const now = 55555;
    await VaultRepository.updateLastOpenedAt('vdoc_001', now);
    const updated = await VaultRepository.findById('vdoc_001');
    expect(updated?.lastOpenedAt).toBe(now);
  });

  it('toggles favorite status of vault document', async () => {
    const newStatus = await VaultRepository.toggleFavorite('vdoc_001');
    expect(newStatus).toBe(true);

    const doc = await VaultRepository.findById('vdoc_001');
    expect(doc?.isFavorite).toBe(true);

    const reverted = await VaultRepository.toggleFavorite('vdoc_001');
    expect(reverted).toBe(false);
  });

  it('deletes vault document permanently from database', async () => {
    await VaultRepository.delete('vdoc_001');
    const doc = await VaultRepository.findById('vdoc_001');
    expect(doc).toBeNull();
  });

  it('maintains strict isolation: vault documents NEVER appear in standard DocumentRepository queries', async () => {
    // Normal document search should not return vault documents
    const normalDocs = await DocumentRepository.searchByName('Contract');
    expect(normalDocs.some((d) => d.id === 'vdoc_001')).toBe(false);

    const allNormalDocs = await DocumentRepository.getAll();
    expect(allNormalDocs.some((d) => d.id === 'vdoc_001' || d.id === 'vdoc_002')).toBe(false);
  });
});
