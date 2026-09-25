import { DocumentRepository } from '../../src/core/database/repositories/documentRepository';
import { RecentRepository } from '../../src/core/database/repositories/recentRepository';
import { FavoriteRepository } from '../../src/core/database/repositories/favoriteRepository';
import { DocumentItem } from '../../src/shared/types';

describe('DocumentRepository & Database Layer', () => {
  const sampleDoc: DocumentItem = {
    id: 'doc_test_1',
    name: 'Notes.txt',
    uri: 'file:///storage/emulated/0/Documents/Notes.txt',
    path: '/storage/emulated/0/Documents/Notes.txt',
    size: 1024,
    mimeType: 'text/plain',
    extension: 'txt',
    folderId: null,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    lastOpenedAt: 1700000000000,
    isFavorite: false,
    isSecured: false,
  };

  it('inserts a document and retrieves it by id', async () => {
    await DocumentRepository.insert(sampleDoc);
    const retrieved = await DocumentRepository.findById('doc_test_1');

    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe('doc_test_1');
    expect(retrieved?.name).toBe('Notes.txt');
    expect(retrieved?.uri).toBe(sampleDoc.uri);
    expect(retrieved?.size).toBe(1024);
  });

  it('upserts a new document when it does not exist', async () => {
    const upserted = await DocumentRepository.upsert({
      name: 'NewDoc.txt',
      uri: 'file:///storage/emulated/0/Documents/NewDoc.txt',
      size: 500,
      mimeType: 'text/plain',
      extension: 'txt',
    });

    expect(upserted).toBeDefined();
    expect(upserted.id).toBeDefined();
    expect(upserted.name).toBe('NewDoc.txt');

    const found = await DocumentRepository.findById(upserted.id);
    expect(found).not.toBeNull();
    expect(found?.name).toBe('NewDoc.txt');
  });

  it('upserts an existing document by uri without duplicating records', async () => {
    // First upsert
    const first = await DocumentRepository.upsert({
      name: 'Resume.txt',
      uri: 'content://com.android.providers.downloads/123',
      size: 200,
      mimeType: 'text/plain',
      extension: 'txt',
    });

    // Second upsert with updated size and name
    const second = await DocumentRepository.upsert({
      name: 'Resume_Updated.txt',
      uri: 'content://com.android.providers.downloads/123',
      size: 350,
    });

    // Should keep same ID and update properties
    expect(second.id).toBe(first.id);
    expect(second.name).toBe('Resume_Updated.txt');
    expect(second.size).toBe(350);

    const retrieved = await DocumentRepository.findById(first.id);
    expect(retrieved?.name).toBe('Resume_Updated.txt');
  });

  it('finds a document by URI', async () => {
    const doc = await DocumentRepository.findByUri(sampleDoc.uri);
    expect(doc).not.toBeNull();
    expect(doc?.id).toBe('doc_test_1');
  });

  it('updates lastOpenedAt timestamp', async () => {
    const newTimestamp = 1750000000000;
    await DocumentRepository.updateLastOpenedAt('doc_test_1', newTimestamp);

    const doc = await DocumentRepository.findById('doc_test_1');
    expect(doc?.lastOpenedAt).toBe(newTimestamp);
  });

  it('manages favorite status persistently', async () => {
    // Initially false
    let isFav = await FavoriteRepository.isFavorite('doc_test_1');
    expect(isFav).toBe(false);

    // Toggle to true
    const toggled = await FavoriteRepository.toggleFavorite('doc_test_1');
    expect(toggled).toBe(true);

    isFav = await FavoriteRepository.isFavorite('doc_test_1');
    expect(isFav).toBe(true);

    // Verify in FavoriteRepository list
    const favs = await FavoriteRepository.getFavoriteDocuments();
    expect(favs.some((d) => d.id === 'doc_test_1')).toBe(true);

    // Toggle back to false
    const untoggled = await FavoriteRepository.toggleFavorite('doc_test_1');
    expect(untoggled).toBe(false);
  });

  it('deletes a document', async () => {
    await DocumentRepository.delete('doc_test_1');
    const doc = await DocumentRepository.findById('doc_test_1');
    expect(doc).toBeNull();
  });

  it('records recent items and orders them with most recently opened first', async () => {
    // Create doc A and doc B
    const docA = await DocumentRepository.upsert({
      id: 'doc_recent_A',
      name: 'DocA.txt',
      uri: 'file:///docs/a.txt',
    });
    const docB = await DocumentRepository.upsert({
      id: 'doc_recent_B',
      name: 'DocB.txt',
      uri: 'file:///docs/b.txt',
    });

    // Add A first, then B after a delay
    await RecentRepository.addRecent(docA.id);
    // Simulate slight time delay
    await new Promise((resolve) => setTimeout(resolve, 10));
    await RecentRepository.addRecent(docB.id);

    const recents = await RecentRepository.getRecentDocuments(5);
    expect(recents.length).toBeGreaterThanOrEqual(2);
    // B was opened after A, so B must be first
    expect(recents[0].id).toBe(docB.id);
    expect(recents[1].id).toBe(docA.id);

    // Clear recents
    await RecentRepository.clearRecent();
    const cleared = await RecentRepository.getRecentDocuments(5);
    // Joined recent table should now be cleared
    expect(cleared.length).toBe(0);
  });
});
