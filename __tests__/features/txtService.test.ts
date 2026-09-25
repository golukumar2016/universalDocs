import RNFS from 'react-native-fs';
import { TxtService } from '../../src/features/editor/engines/txt/txtService';
import { TxtReader } from '../../src/features/editor/engines/txt/txtReader';
import { TxtWriter } from '../../src/features/editor/engines/txt/txtWriter';
import { DocumentItem } from '../../src/shared/types';
import { DocumentRepository } from '../../src/core/database/repositories/documentRepository';
import { RecentRepository } from '../../src/core/database/repositories/recentRepository';

describe('TxtService & Offline TXT Engine', () => {
  const mockDoc: DocumentItem = {
    id: 'doc_txt_service_1',
    name: 'Diary.txt',
    uri: 'file:///data/user/0/com.universaldocs/files/Diary.txt',
    path: '/data/user/0/com.universaldocs/files/Diary.txt',
    size: 42,
    mimeType: 'text/plain',
    extension: 'txt',
    folderId: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    lastOpenedAt: Date.now(),
    isFavorite: false,
    isSecured: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reads content from existing file', async () => {
    (RNFS.exists as jest.Mock).mockResolvedValueOnce(true);
    (RNFS.stat as jest.Mock).mockResolvedValueOnce({ size: 42 });
    (RNFS.readFile as jest.Mock).mockResolvedValueOnce('Hello offline world');

    const result = await TxtService.loadDocument(mockDoc);
    expect(result.content).toBe('Hello offline world');
    expect(result.document.id).toBe(mockDoc.id);

    // Verify recent was updated
    const recents = await RecentRepository.getRecentDocuments(5);
    expect(recents.some((d) => d.id === mockDoc.id)).toBe(true);
  });

  it('saves content safely and updates repository metadata', async () => {
    (RNFS.exists as jest.Mock).mockResolvedValue(true);
    (RNFS.writeFile as jest.Mock).mockResolvedValue(true);
    (RNFS.copyFile as jest.Mock).mockResolvedValue(true);
    (RNFS.moveFile as jest.Mock).mockResolvedValue(true);
    (RNFS.unlink as jest.Mock).mockResolvedValue(true);

    const updated = await TxtService.saveDocument(mockDoc, 'Updated content for diary');
    expect(updated.size).toBe('Updated content for diary'.length);

    // Check repository was updated
    const fromDb = await DocumentRepository.findById(mockDoc.id);
    expect(fromDb?.size).toBe('Updated content for diary'.length);
  });

  it('handles Save As by creating a new document in offline storage', async () => {
    (RNFS.exists as jest.Mock).mockResolvedValue(true);
    (RNFS.writeFile as jest.Mock).mockResolvedValue(true);
    (RNFS.stat as jest.Mock).mockResolvedValue({ size: 25 });

    const newDoc = await TxtService.saveDocumentAs(
      mockDoc,
      'My New Notes.txt',
      'Brand new note content'
    );

    expect(newDoc.name).toBe('My New Notes.txt');
    expect(newDoc.extension).toBe('txt');
    expect(newDoc.uri).toContain('My New Notes.txt');

    const fromDb = await DocumentRepository.findById(newDoc.id);
    expect(fromDb).not.toBeNull();
    expect(fromDb?.name).toBe('My New Notes.txt');
  });

  it('handles read failure when file no longer exists with user-friendly error', async () => {
    (RNFS.exists as jest.Mock).mockResolvedValueOnce(false);

    await expect(TxtReader.readTextFile('/missing/file.txt')).rejects.toThrow(
      'This document is no longer available.'
    );
  });

  it('handles read failure when permission is lost with user-friendly error', async () => {
    (RNFS.exists as jest.Mock).mockResolvedValueOnce(true);
    (RNFS.stat as jest.Mock).mockResolvedValueOnce({ size: 50 });
    (RNFS.readFile as jest.Mock).mockRejectedValueOnce(new Error('Permission denied'));

    await expect(TxtReader.readTextFile('/protected/file.txt')).rejects.toThrow(
      'UniversalDocs no longer has access to this document. Please select the file again.'
    );
  });

  it('handles write failure safely without destroying original file', async () => {
    (RNFS.writeFile as jest.Mock).mockRejectedValueOnce(new Error('Disk full'));

    await expect(
      TxtWriter.writeTextFile('/path/to/important.txt', 'New content')
    ).rejects.toThrow('Unable to save changes. Your original document has not been replaced.');
  });
});
