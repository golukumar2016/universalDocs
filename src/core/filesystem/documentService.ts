import { pick, types } from '@react-native-documents/picker';
import { DocumentItem } from '../../shared/types';
import { FILE_PATHS, FileSystem } from './fileSystem';
import { DirectoryManager } from './directoryManager';
import { DocumentRepository } from '../database/repositories/documentRepository';
import { RecentRepository } from '../database/repositories/recentRepository';
import { engineRegistry } from '../engines/engineRegistry';
import { getFileExtension, getMimeTypeFromExtension } from '../../shared/utils';
import { FileSystemError } from '../errors/AppError';

export class DocumentService {
  /**
   * Opens the native document picker to select an existing file from device,
   * copies it to local offline app storage, and records it in SQLite.
   */
  static async pickAndImportDocument(): Promise<DocumentItem | null> {
    try {
      const results = await pick({
        type: [types.allFiles],
        mode: 'import',
      });

      if (!results || results.length === 0) {
        return null;
      }

      const file = results[0];
      await DirectoryManager.ensureDirectoryExists(FILE_PATHS.APP_DOCUMENTS);

      const fileName = file.name || `Document_${Date.now()}`;
      const extension = getFileExtension(fileName) || 'txt';
      const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const targetPath = `${FILE_PATHS.APP_DOCUMENTS}/${docId}_${fileName}`;

      // Copy file from picker temp URI to our persistent offline documents directory
      const sourceUri = file.uri;
      await FileSystem.copy(sourceUri, targetPath);

      const stats = await FileSystem.stat(targetPath);
      const mimeType = file.type || getMimeTypeFromExtension(extension);

      const docItem: DocumentItem = {
        id: docId,
        name: fileName,
        uri: `file://${targetPath}`,
        path: targetPath,
        size: Number(stats.size || file.size || 0),
        mimeType,
        extension,
        folderId: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastOpenedAt: Date.now(),
        isFavorite: false,
        isSecured: false,
      };

      await DocumentRepository.insert(docItem);
      await RecentRepository.addRecent(docItem.id);

      return docItem;
    } catch (error: any) {
      if (error?.message?.includes('User canceled') || error?.code === 'DOCUMENT_PICKER_CANCELED') {
        return null;
      }
      throw new FileSystemError('Failed to import document from device', error);
    }
  }

  /**
   * Creates a new blank document directly in local offline app storage.
   */
  static async createNewDocument(
    name: string,
    extension: string = 'txt',
    initialContent: string = ''
  ): Promise<DocumentItem> {
    await DirectoryManager.ensureDirectoryExists(FILE_PATHS.APP_DOCUMENTS);

    const cleanExt = extension.replace('.', '').toLowerCase();
    const cleanName = name.endsWith(`.${cleanExt}`) ? name : `${name}.${cleanExt}`;
    const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const engine = engineRegistry.getEngineForFile(cleanExt);

    let filePath: string;
    let size: number;

    if (engine) {
      const result = await engine.createNewFile(
        FILE_PATHS.APP_DOCUMENTS,
        `${docId}_${cleanName}`,
        initialContent
      );
      filePath = result.path;
      size = result.size;
    } else {
      filePath = `${FILE_PATHS.APP_DOCUMENTS}/${docId}_${cleanName}`;
      await FileSystem.copy(filePath, filePath); // or create file
      size = 0;
    }

    const docItem: DocumentItem = {
      id: docId,
      name: cleanName,
      uri: `file://${filePath}`,
      path: filePath,
      size,
      mimeType: getMimeTypeFromExtension(cleanExt),
      extension: cleanExt,
      folderId: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastOpenedAt: Date.now(),
      isFavorite: false,
      isSecured: false,
    };

    await DocumentRepository.insert(docItem);
    await RecentRepository.addRecent(docItem.id);

    return docItem;
  }

  /**
   * Loads document content using the appropriate format engine.
   */
  static async loadContent(filePath: string, extension: string): Promise<string> {
    const engine = engineRegistry.getEngineForFile(extension);
    if (!engine) {
      throw new FileSystemError(`No engine available for .${extension} files.`);
    }
    return await engine.loadContent(filePath);
  }

  /**
   * Saves updated content locally and updates database metadata.
   */
  static async saveContent(
    document: DocumentItem,
    newContent: string
  ): Promise<DocumentItem> {
    const engine = engineRegistry.getEngineForFile(document.extension);
    if (!engine) {
      throw new FileSystemError(`No engine available for .${document.extension} files.`);
    }

    await engine.saveContent(document.path, newContent);
    const stats = await FileSystem.stat(document.path);

    const updatedDoc: DocumentItem = {
      ...document,
      size: Number(stats.size || 0),
      updatedAt: Date.now(),
      lastOpenedAt: Date.now(),
    };

    await DocumentRepository.insert(updatedDoc);
    await RecentRepository.addRecent(document.id);

    return updatedDoc;
  }

  /**
   * Deletes document from local filesystem and database.
   */
  static async deleteDocument(doc: DocumentItem): Promise<void> {
    await FileSystem.unlink(doc.path);
    await DocumentRepository.delete(doc.id);
  }

  /**
   * Toggles favorite status.
   */
  static async toggleFavorite(doc: DocumentItem): Promise<DocumentItem> {
    const updated: DocumentItem = {
      ...doc,
      isFavorite: !doc.isFavorite,
      updatedAt: Date.now(),
    };
    await DocumentRepository.insert(updated);
    return updated;
  }
}

export default DocumentService;
