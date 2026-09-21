/**
 * FileBrowserService
 * 
 * Responsible for fetching and sorting real local files and directories
 * from Android filesystem and Storage Access Framework (SAF) document providers.
 * 
 * Never returns mock or hardcoded files.
 */

import { NativeModules, Platform } from 'react-native';
import RNFS from 'react-native-fs';
import { pickDirectory } from '@react-native-documents/picker';
import { FileTypeResolver } from '../../../core/documents/fileTypeResolver';

const { IncomingFileModule } = NativeModules;

export interface BrowserItem {
  id: string;
  name: string;
  path: string; // Absolute path or content URI
  uri: string;  // file:// or content://
  isDirectory: boolean;
  isFile: boolean;
  extension: string;
  mimeType: string;
  documentType: string; // 'PDF' | 'TXT' | 'DOC' | 'DOCX' | 'XLS' | 'XLSX' | 'PPT' | 'PPTX' | 'CSV' | 'MD' | 'FOLDER' | 'UNSUPPORTED'
  isSupported: boolean;
  size: number;
  modifiedAt: number;
  itemCount?: number;
}

export interface FolderLocation {
  name: string;
  path: string;
  isContentUri: boolean;
  documentId?: string; // For SAF tree subdirectories
}

export type SortOption = 'name' | 'date' | 'size' | 'type';
export type SortDirection = 'asc' | 'desc';

export class FileBrowserService {
  /**
   * Checks if UniversalDocs has permission to read files from external storage.
   */
  public static async hasStoragePermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

    try {
      if (IncomingFileModule && typeof IncomingFileModule.hasAllFilesAccess === 'function') {
        return await IncomingFileModule.hasAllFilesAccess();
      }
    } catch (e) {
      console.warn('FileBrowserService: Error checking storage permission:', e);
    }

    return false;
  }

  /**
   * Prompts user for storage permission.
   */
  public static async requestStoragePermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

    try {
      if (IncomingFileModule && typeof IncomingFileModule.requestAllFilesAccess === 'function') {
        return await IncomingFileModule.requestAllFilesAccess();
      }
    } catch (e) {
      console.warn('FileBrowserService: Error requesting storage permission:', e);
    }

    return false;
  }

  /**
   * Returns default system directories available on device.
   */
  public static async getDefaultDirectories(): Promise<Record<string, string>> {
    if (Platform.OS === 'android' && IncomingFileModule && typeof IncomingFileModule.getDefaultDirectories === 'function') {
      try {
        return await IncomingFileModule.getDefaultDirectories();
      } catch (e) {
        console.warn('FileBrowserService: Failed to get default directories:', e);
      }
    }

    return {
      download: `${RNFS.ExternalDirectoryPath || RNFS.DocumentDirectoryPath}/Download`,
      documents: RNFS.DocumentDirectoryPath,
      appInternal: RNFS.DocumentDirectoryPath,
    };
  }

  /**
   * Prompts user to pick an arbitrary folder via Storage Access Framework (SAF).
   */
  public static async pickFolderViaSAF(): Promise<FolderLocation | null> {
    try {
      const response = await pickDirectory();
      if (!response || !response.uri) return null;

      const uri = response.uri;
      const name = FileTypeResolver.extractFileName(uri);

      return {
        name: name || 'Selected Folder',
        path: uri,
        isContentUri: true,
      };
    } catch (error: any) {
      if (error?.message && !error.message.includes('cancelled') && !error.message.includes('canceled')) {
        console.warn('FileBrowserService: Error picking folder:', error);
      }
      return null;
    }
  }

  /**
   * Reads the real files and folders inside a given location.
   * Handles both normal filesystem paths and SAF content:// tree URIs.
   */
  public static async readFolder(location: FolderLocation): Promise<BrowserItem[]> {
    if (!location || !location.path) return [];

    if (location.isContentUri || location.path.startsWith('content://')) {
      return this.readDocumentTreeUri(location.path, location.documentId);
    }

    return this.readFilesystemPath(location.path);
  }

  /**
   * Reads real contents from a standard filesystem path.
   */
  public static async readFilesystemPath(dirPath: string): Promise<BrowserItem[]> {
    // 1. Try native IncomingFileModule.listFiles first for maximum Android compatibility
    if (Platform.OS === 'android' && IncomingFileModule && typeof IncomingFileModule.listFiles === 'function') {
      try {
        const rawFiles = await IncomingFileModule.listFiles(dirPath);
        if (Array.isArray(rawFiles)) {
          return rawFiles.map((file: any) => {
            const isDir = !!file.isDirectory;
            const ext = (file.extension || '').toLowerCase();
            const fileTypeInfo = isDir
              ? null
              : FileTypeResolver.resolveFileType(file.name, file.mimeType);

            return {
              id: file.path || file.uri,
              name: file.name,
              path: file.path,
              uri: file.uri,
              isDirectory: isDir,
              isFile: !isDir,
              extension: isDir ? '' : ext,
              mimeType: isDir ? 'resource/folder' : (fileTypeInfo?.mimeType || file.mimeType || 'application/octet-stream'),
              documentType: isDir ? 'FOLDER' : (fileTypeInfo?.type || 'UNSUPPORTED'),
              isSupported: isDir ? true : (fileTypeInfo?.isSupported || false),
              size: typeof file.size === 'number' ? file.size : 0,
              modifiedAt: typeof file.modifiedAt === 'number' ? file.modifiedAt : Date.now(),
              itemCount: isDir ? file.itemCount : undefined,
            };
          });
        }
      } catch (err: any) {
        // If native listing fails, fall through to RNFS
        console.warn(`FileBrowserService: Native listFiles failed on ${dirPath}: ${err?.message}`);
      }
    }

    // 2. Fallback to RNFS.readDir
    try {
      const exists = await RNFS.exists(dirPath);
      if (!exists) {
        return [];
      }

      const items = await RNFS.readDir(dirPath);
      return items.map((item) => {
        const isDir = item.isDirectory();
        const ext = FileTypeResolver.extractExtension(item.name);
        const fileTypeInfo = isDir ? null : FileTypeResolver.resolveFileType(item.name);

        return {
          id: item.path,
          name: item.name,
          path: item.path,
          uri: `file://${item.path}`,
          isDirectory: isDir,
          isFile: !isDir,
          extension: isDir ? '' : ext,
          mimeType: isDir ? 'resource/folder' : (fileTypeInfo?.mimeType || 'application/octet-stream'),
          documentType: isDir ? 'FOLDER' : (fileTypeInfo?.type || 'UNSUPPORTED'),
          isSupported: isDir ? true : (fileTypeInfo?.isSupported || false),
          size: item.size || 0,
          modifiedAt: item.mtime ? item.mtime.getTime() : Date.now(),
        };
      });
    } catch (error: any) {
      console.warn(`FileBrowserService: RNFS.readDir error on ${dirPath}:`, error);
      throw error;
    }
  }

  /**
   * Reads real contents from a SAF content:// tree URI.
   */
  public static async readDocumentTreeUri(
    treeUri: string,
    documentId?: string
  ): Promise<BrowserItem[]> {
    if (Platform.OS === 'android' && IncomingFileModule && typeof IncomingFileModule.listDocumentTree === 'function') {
      try {
        const rawItems = await IncomingFileModule.listDocumentTree(treeUri, documentId || null);
        if (Array.isArray(rawItems)) {
          return rawItems.map((raw: any) => {
            const isDir = !!raw.isDirectory;
            const ext = (raw.extension || '').toLowerCase();
            const fileTypeInfo = isDir
              ? null
              : FileTypeResolver.resolveFileType(raw.name, raw.mimeType);

            return {
              id: raw.id || raw.uri,
              name: raw.name,
              path: raw.path || raw.uri,
              uri: raw.uri,
              isDirectory: isDir,
              isFile: !isDir,
              extension: isDir ? '' : ext,
              mimeType: isDir ? 'resource/folder' : (fileTypeInfo?.mimeType || raw.mimeType || 'application/octet-stream'),
              documentType: isDir ? 'FOLDER' : (fileTypeInfo?.type || 'UNSUPPORTED'),
              isSupported: isDir ? true : (fileTypeInfo?.isSupported || false),
              size: typeof raw.size === 'number' ? raw.size : 0,
              modifiedAt: typeof raw.modifiedAt === 'number' ? raw.modifiedAt : Date.now(),
            };
          });
        }
      } catch (err: any) {
        console.warn(`FileBrowserService: listDocumentTree error on ${treeUri}:`, err);
        throw err;
      }
    }

    return [];
  }

  /**
   * Sorts items: Folders first, files second.
   * Then sorts by the selected option and direction.
   */
  public static sortItems(
    items: BrowserItem[],
    sortBy: SortOption = 'name',
    direction: SortDirection = 'asc'
  ): BrowserItem[] {
    const folders = items.filter((item) => item.isDirectory);
    const files = items.filter((item) => !item.isDirectory);

    const comparator = (a: BrowserItem, b: BrowserItem): number => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
          break;
        case 'date':
          comparison = (a.modifiedAt || 0) - (b.modifiedAt || 0);
          break;
        case 'size':
          comparison = (a.size || 0) - (b.size || 0);
          break;
        case 'type':
          comparison = (a.documentType || a.extension).localeCompare(b.documentType || b.extension);
          break;
      }

      return direction === 'asc' ? comparison : -comparison;
    };

    folders.sort(comparator);
    files.sort(comparator);

    return [...folders, ...files];
  }
}

export default FileBrowserService;
