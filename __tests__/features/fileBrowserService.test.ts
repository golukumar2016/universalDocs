import { FileBrowserService, BrowserItem } from '../../src/features/documents/services/fileBrowserService';
import { NativeModules, Platform } from 'react-native';
import RNFS from 'react-native-fs';

jest.mock('react-native', () => ({
  Platform: {
    OS: 'android',
  },
  NativeModules: {
    IncomingFileModule: {
      hasAllFilesAccess: jest.fn(),
      requestAllFilesAccess: jest.fn(),
      getDefaultDirectories: jest.fn(),
      listFiles: jest.fn(),
      listDocumentTree: jest.fn(),
    },
  },
}));

jest.mock('react-native-fs', () => ({
  exists: jest.fn(),
  readDir: jest.fn(),
  ExternalDirectoryPath: '/storage/emulated/0/Android/data/com.universaldocs/files',
  DocumentDirectoryPath: '/data/user/0/com.universaldocs/files',
}));

jest.mock('@react-native-documents/picker', () => ({
  pickDirectory: jest.fn(),
}));

describe('FileBrowserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'android';
  });

  describe('Sorting (Folders first, then files)', () => {
    const mockItems: BrowserItem[] = [
      {
        id: '1',
        name: 'Report.pdf',
        path: '/storage/Report.pdf',
        uri: 'file:///storage/Report.pdf',
        isDirectory: false,
        isFile: true,
        extension: 'pdf',
        mimeType: 'application/pdf',
        documentType: 'PDF',
        isSupported: true,
        size: 500,
        modifiedAt: 1000,
      },
      {
        id: '2',
        name: 'Alpha Folder',
        path: '/storage/Alpha Folder',
        uri: 'file:///storage/Alpha Folder',
        isDirectory: true,
        isFile: false,
        extension: '',
        mimeType: 'resource/folder',
        documentType: 'FOLDER',
        isSupported: true,
        size: 0,
        modifiedAt: 3000,
        itemCount: 4,
      },
      {
        id: '3',
        name: 'Beta Folder',
        path: '/storage/Beta Folder',
        uri: 'file:///storage/Beta Folder',
        isDirectory: true,
        isFile: false,
        extension: '',
        mimeType: 'resource/folder',
        documentType: 'FOLDER',
        isSupported: true,
        size: 0,
        modifiedAt: 2000,
        itemCount: 2,
      },
      {
        id: '4',
        name: 'Alpha.txt',
        path: '/storage/Alpha.txt',
        uri: 'file:///storage/Alpha.txt',
        isDirectory: false,
        isFile: true,
        extension: 'txt',
        mimeType: 'text/plain',
        documentType: 'TXT',
        isSupported: true,
        size: 1500,
        modifiedAt: 4000,
      },
    ];

    it('always puts folders first regardless of file names (name asc)', () => {
      const sorted = FileBrowserService.sortItems(mockItems, 'name', 'asc');
      expect(sorted[0].name).toBe('Alpha Folder');
      expect(sorted[1].name).toBe('Beta Folder');
      expect(sorted[2].name).toBe('Alpha.txt');
      expect(sorted[3].name).toBe('Report.pdf');
    });

    it('sorts folders first when name desc', () => {
      const sorted = FileBrowserService.sortItems(mockItems, 'name', 'desc');
      expect(sorted[0].name).toBe('Beta Folder');
      expect(sorted[1].name).toBe('Alpha Folder');
      expect(sorted[2].name).toBe('Report.pdf');
      expect(sorted[3].name).toBe('Alpha.txt');
    });

    it('sorts by size with folders first', () => {
      const sorted = FileBrowserService.sortItems(mockItems, 'size', 'asc');
      // Folders have size 0, then files by size: 500 then 1500
      expect(sorted[0].isDirectory).toBe(true);
      expect(sorted[1].isDirectory).toBe(true);
      expect(sorted[2].name).toBe('Report.pdf'); // 500
      expect(sorted[3].name).toBe('Alpha.txt'); // 1500
    });

    it('sorts by date with folders first', () => {
      const sorted = FileBrowserService.sortItems(mockItems, 'date', 'desc');
      // Folders sorted desc: 3000 (Alpha) then 2000 (Beta)
      expect(sorted[0].name).toBe('Alpha Folder');
      expect(sorted[1].name).toBe('Beta Folder');
      // Files sorted desc: 4000 (Alpha.txt) then 1000 (Report.pdf)
      expect(sorted[2].name).toBe('Alpha.txt');
      expect(sorted[3].name).toBe('Report.pdf');
    });

    it('sorts by type with folders first', () => {
      const sorted = FileBrowserService.sortItems(mockItems, 'type', 'asc');
      expect(sorted[0].isDirectory).toBe(true);
      expect(sorted[1].isDirectory).toBe(true);
      expect(sorted[2].name).toBe('Report.pdf'); // PDF comes before TXT
      expect(sorted[3].name).toBe('Alpha.txt');
    });
  });

  describe('Storage Permissions', () => {
    it('checks all files access permission on Android', async () => {
      NativeModules.IncomingFileModule.hasAllFilesAccess.mockResolvedValueOnce(true);
      const result = await FileBrowserService.hasStoragePermission();
      expect(result).toBe(true);
      expect(NativeModules.IncomingFileModule.hasAllFilesAccess).toHaveBeenCalled();
    });

    it('requests all files access permission on Android', async () => {
      NativeModules.IncomingFileModule.requestAllFilesAccess.mockResolvedValueOnce(true);
      const result = await FileBrowserService.requestStoragePermission();
      expect(result).toBe(true);
      expect(NativeModules.IncomingFileModule.requestAllFilesAccess).toHaveBeenCalled();
    });
  });

  describe('Reading Filesystem', () => {
    it('uses native listFiles if available and resolves file types accurately', async () => {
      NativeModules.IncomingFileModule.listFiles.mockResolvedValueOnce([
        {
          name: 'SubFolder',
          path: '/storage/Download/SubFolder',
          uri: 'file:///storage/Download/SubFolder',
          isDirectory: true,
          itemCount: 3,
          size: 0,
          modifiedAt: 123456,
        },
        {
          name: 'Doc.pdf',
          path: '/storage/Download/Doc.pdf',
          uri: 'file:///storage/Download/Doc.pdf',
          isDirectory: false,
          extension: 'pdf',
          mimeType: 'application/pdf',
          size: 1048576,
          modifiedAt: 123457,
        },
      ]);

      const items = await FileBrowserService.readFilesystemPath('/storage/Download');
      expect(items.length).toBe(2);

      const folder = items[0];
      expect(folder.name).toBe('SubFolder');
      expect(folder.isDirectory).toBe(true);
      expect(folder.documentType).toBe('FOLDER');
      expect(folder.itemCount).toBe(3);

      const file = items[1];
      expect(file.name).toBe('Doc.pdf');
      expect(file.isDirectory).toBe(false);
      expect(file.documentType).toBe('PDF');
      expect(file.isSupported).toBe(true);
      expect(file.size).toBe(1048576);
    });

    it('falls back to RNFS if native listFiles throws an error', async () => {
      NativeModules.IncomingFileModule.listFiles.mockRejectedValueOnce(new Error('Permission denied'));
      (RNFS.exists as jest.Mock).mockResolvedValueOnce(true);
      (RNFS.readDir as jest.Mock).mockResolvedValueOnce([
        {
          name: 'notes.txt',
          path: '/storage/Download/notes.txt',
          size: 256,
          mtime: new Date('2026-01-01'),
          isDirectory: () => false,
          isFile: () => true,
        },
      ]);

      const items = await FileBrowserService.readFilesystemPath('/storage/Download');
      expect(items.length).toBe(1);
      expect(items[0].name).toBe('notes.txt');
      expect(items[0].documentType).toBe('TXT');
      expect(items[0].size).toBe(256);
    });
  });

  describe('Reading Document Tree URIs (SAF)', () => {
    it('queries IncomingFileModule.listDocumentTree for content:// URIs', async () => {
      NativeModules.IncomingFileModule.listDocumentTree.mockResolvedValueOnce([
        {
          id: 'tree-doc-1',
          name: 'Data.csv',
          path: 'content://com.android.providers.downloads.documents/tree/.../document/1',
          uri: 'content://com.android.providers.downloads.documents/tree/.../document/1',
          isDirectory: false,
          extension: 'csv',
          mimeType: 'text/csv',
          size: 2048,
          modifiedAt: 555555,
        },
      ]);

      const items = await FileBrowserService.readDocumentTreeUri(
        'content://com.android.providers.downloads.documents/tree/downloads'
      );

      expect(items.length).toBe(1);
      expect(items[0].name).toBe('Data.csv');
      expect(items[0].documentType).toBe('CSV');
      expect(items[0].isSupported).toBe(true);
    });
  });
});
