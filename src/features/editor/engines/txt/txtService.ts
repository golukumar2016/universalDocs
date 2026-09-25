import { Document, DocumentItem } from '../../../../shared/types';
import { DocumentRepository } from '../../../../core/database/repositories/documentRepository';
import { RecentRepository } from '../../../../core/database/repositories/recentRepository';
import { DocumentResolver } from '../../../../core/documents/documentResolver';
import { FILE_PATHS } from '../../../../core/filesystem/fileSystem';
import { TxtReader } from './txtReader';
import { TxtWriter } from './txtWriter';

export class TxtService {
  /**
   * Loads a document from URI, Document, or DocumentItem,
   * reads its text contents from disk/SAF, and updates the local repository and Recents.
   */
  static async loadDocument(
    input: DocumentItem | Document | string
  ): Promise<{ content: string; document: DocumentItem }> {
    let resolvedItem: DocumentItem;

    if (typeof input === 'string') {
      const resolved = DocumentResolver.resolveUri(input);
      resolvedItem = await DocumentRepository.upsert({
        id: resolved.document.id,
        name: resolved.document.name,
        uri: resolved.document.uri,
        path: resolved.document.uri.replace('file://', ''),
        size: resolved.document.size || 0,
        mimeType: resolved.document.mimeType,
        extension: resolved.document.extension,
        lastOpenedAt: Date.now(),
      });
    } else if ('path' in input && input.path) {
      resolvedItem = await DocumentRepository.upsert({
        id: input.id,
        name: input.name,
        uri: input.uri,
        path: input.path,
        size: input.size,
        mimeType: input.mimeType,
        extension: input.extension,
        lastOpenedAt: Date.now(),
      });
    } else {
      resolvedItem = await DocumentRepository.upsert({
        id: input.id,
        name: input.name,
        uri: input.uri,
        path: input.uri.replace('file://', ''),
        size: input.size || 0,
        mimeType: input.mimeType,
        extension: input.extension,
        lastOpenedAt: Date.now(),
      });
    }

    // Update Recent repository
    await RecentRepository.addRecent(resolvedItem.id);

    // Read real file content
    const readTarget = resolvedItem.uri.startsWith('content://')
      ? resolvedItem.uri
      : resolvedItem.path || resolvedItem.uri;

    const content = await TxtReader.readTextFile(readTarget);

    return {
      content,
      document: resolvedItem,
    };
  }

  /**
   * Saves updated text back to the original document safely,
   * updates metadata in SQLite, and updates Recent.
   */
  static async saveDocument(
    document: DocumentItem,
    newContent: string
  ): Promise<DocumentItem> {
    const saveTarget = document.uri.startsWith('content://')
      ? document.uri
      : document.path || document.uri;

    await TxtWriter.writeTextFile(saveTarget, newContent);

    const now = Date.now();
    const updatedDoc: DocumentItem = {
      ...document,
      size: newContent.length,
      updatedAt: now,
      lastOpenedAt: now,
    };

    await DocumentRepository.insert(updatedDoc);
    await RecentRepository.addRecent(updatedDoc.id);

    return updatedDoc;
  }

  /**
   * Saves content as a brand new local document, registers it in SQLite,
   * and marks it as recently opened.
   */
  static async saveDocumentAs(
    originalDoc: DocumentItem | Document | null,
    newFileName: string,
    content: string,
    targetDirectory: string = FILE_PATHS.APP_DOCUMENTS
  ): Promise<DocumentItem> {
    const result = await TxtWriter.createNewTextFile(
      targetDirectory,
      newFileName,
      content
    );

    const now = Date.now();
    const cleanName = newFileName.trim().toLowerCase().endsWith('.txt')
      ? newFileName.trim()
      : `${newFileName.trim()}.txt`;

    const newDocItem: DocumentItem = {
      id: `doc_${now}_${Math.random().toString(36).substring(2, 8)}`,
      name: cleanName,
      uri: result.uri,
      path: result.path,
      size: result.size,
      mimeType: 'text/plain',
      extension: 'txt',
      folderId: null,
      createdAt: now,
      updatedAt: now,
      lastOpenedAt: now,
      isFavorite: false,
      isSecured: false,
    };

    await DocumentRepository.insert(newDocItem);
    await RecentRepository.addRecent(newDocItem.id);

    return newDocItem;
  }
}

export default TxtService;
