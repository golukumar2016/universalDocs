import { Document, DocumentItem } from '../../../shared/types';
import { DocumentRepository } from '../../../core/database/repositories/documentRepository';
import { RecentRepository } from '../../../core/database/repositories/recentRepository';
import { DocumentResolver, ResolvedDocument } from '../../../core/documents/documentResolver';

export type EditorRouteTarget =
  | {
      type: 'txt';
      screen: 'Editor';
      document: DocumentItem;
      params: { documentId: string; filePath: string; title: string; document: DocumentItem };
    }
  | {
      type: 'pdf';
      screen: 'DocumentViewer';
      document: DocumentItem;
      params: { document: Document };
    }
  | {
      type: 'unsupported';
      screen: 'UnsupportedDocument';
      document: DocumentItem;
      reason: string;
      params: { document: Document; reason: string };
    };

export class EditorRouter {
  private static readonly TXT_EXTENSIONS = new Set([
    'txt',
    'text',
    'md',
    'markdown',
    'csv',
    'json',
    'log',
    'xml',
    'yaml',
    'yml',
    'ini',
    'conf',
  ]);

  private static readonly TXT_MIME_TYPES = new Set([
    'text/plain',
    'text/markdown',
    'text/x-markdown',
    'text/csv',
    'application/json',
    'text/xml',
    'text/yaml',
  ]);

  /**
   * Resolves the navigation route and editor target for any given document.
   */
  static resolveRoute(doc: Document | DocumentItem): EditorRouteTarget {
    const ext = (doc.extension || '').toLowerCase().replace(/^\./, '');
    const mime = (doc.mimeType || '').toLowerCase();

    const normalizedDocItem: DocumentItem =
      'path' in doc && doc.path
        ? (doc as DocumentItem)
        : {
            id: doc.id,
            name: doc.name,
            uri: doc.uri,
            path: doc.uri.replace('file://', ''),
            size: doc.size || 0,
            mimeType: doc.mimeType,
            extension: ext,
            folderId: null,
            createdAt: doc.createdAt || Date.now(),
            updatedAt: ('modifiedAt' in doc ? doc.modifiedAt : undefined) || doc.createdAt || Date.now(),
            lastOpenedAt: Date.now(),
            isFavorite: false,
            isSecured: false,
          };

    // 1. Text Formats -> TXT Editor
    if (this.TXT_EXTENSIONS.has(ext) || this.TXT_MIME_TYPES.has(mime)) {
      return {
        type: 'txt',
        screen: 'Editor',
        document: normalizedDocItem,
        params: {
          documentId: normalizedDocItem.id,
          filePath: normalizedDocItem.path || normalizedDocItem.uri,
          title: normalizedDocItem.name,
          document: normalizedDocItem,
        },
      };
    }

    // 2. PDF -> Document Viewer
    if (ext === 'pdf' || mime === 'application/pdf') {
      const viewerDoc: Document = {
        id: normalizedDocItem.id,
        name: normalizedDocItem.name,
        uri: normalizedDocItem.uri,
        mimeType: normalizedDocItem.mimeType,
        extension: normalizedDocItem.extension,
        size: normalizedDocItem.size,
        createdAt: normalizedDocItem.createdAt,
        modifiedAt: normalizedDocItem.updatedAt,
      };
      return {
        type: 'pdf',
        screen: 'DocumentViewer',
        document: normalizedDocItem,
        params: {
          document: viewerDoc,
        },
      };
    }

    // 3. Word Documents (DOC / DOCX) -> Unsupported flow
    if (
      ext === 'doc' ||
      ext === 'docx' ||
      mime.includes('word') ||
      mime.includes('officedocument.wordprocessingml')
    ) {
      const viewerDoc: Document = {
        id: normalizedDocItem.id,
        name: normalizedDocItem.name,
        uri: normalizedDocItem.uri,
        mimeType: normalizedDocItem.mimeType,
        extension: normalizedDocItem.extension,
        size: normalizedDocItem.size,
        createdAt: normalizedDocItem.createdAt,
        modifiedAt: normalizedDocItem.updatedAt,
      };
      const reason = 'Word document (.docx) editing will be available in a future update.';
      return {
        type: 'unsupported',
        screen: 'UnsupportedDocument',
        document: normalizedDocItem,
        reason,
        params: {
          document: viewerDoc,
          reason,
        },
      };
    }

    // 4. Spreadsheets (XLS / XLSX) -> Unsupported flow
    if (
      ext === 'xls' ||
      ext === 'xlsx' ||
      mime.includes('excel') ||
      mime.includes('spreadsheetml')
    ) {
      const viewerDoc: Document = {
        id: normalizedDocItem.id,
        name: normalizedDocItem.name,
        uri: normalizedDocItem.uri,
        mimeType: normalizedDocItem.mimeType,
        extension: normalizedDocItem.extension,
        size: normalizedDocItem.size,
        createdAt: normalizedDocItem.createdAt,
        modifiedAt: normalizedDocItem.updatedAt,
      };
      const reason = 'Spreadsheet (.xlsx) viewing and editing will be available in a future update.';
      return {
        type: 'unsupported',
        screen: 'UnsupportedDocument',
        document: normalizedDocItem,
        reason,
        params: {
          document: viewerDoc,
          reason,
        },
      };
    }

    // 5. Presentations (PPT / PPTX) -> Unsupported flow
    if (
      ext === 'ppt' ||
      ext === 'pptx' ||
      mime.includes('powerpoint') ||
      mime.includes('presentationml')
    ) {
      const viewerDoc: Document = {
        id: normalizedDocItem.id,
        name: normalizedDocItem.name,
        uri: normalizedDocItem.uri,
        mimeType: normalizedDocItem.mimeType,
        extension: normalizedDocItem.extension,
        size: normalizedDocItem.size,
        createdAt: normalizedDocItem.createdAt,
        modifiedAt: normalizedDocItem.updatedAt,
      };
      const reason = 'Presentation (.pptx) viewing and editing will be available in a future update.';
      return {
        type: 'unsupported',
        screen: 'UnsupportedDocument',
        document: normalizedDocItem,
        reason,
        params: {
          document: viewerDoc,
          reason,
        },
      };
    }

    // 6. Generic unsupported format
    const viewerDoc: Document = {
      id: normalizedDocItem.id,
      name: normalizedDocItem.name,
      uri: normalizedDocItem.uri,
      mimeType: normalizedDocItem.mimeType,
      extension: normalizedDocItem.extension,
      size: normalizedDocItem.size,
      createdAt: normalizedDocItem.createdAt,
      modifiedAt: normalizedDocItem.updatedAt,
    };
    const reason = `UniversalDocs does not support the .${ext || 'unknown'} format yet.`;
    return {
      type: 'unsupported',
      screen: 'UnsupportedDocument',
      document: normalizedDocItem,
      reason,
      params: {
        document: viewerDoc,
        reason,
      },
    };
  }

  /**
   * Registers/upserts the document locally in SQLite, adds it to Recent,
   * resolves the route, and navigates to the appropriate screen.
   */
  static async openDocument(
    navigation: any,
    input: Document | DocumentItem | ResolvedDocument | string
  ): Promise<EditorRouteTarget> {
    let doc: Document | DocumentItem;

    if (typeof input === 'string') {
      const resolved = DocumentResolver.resolveUri(input);
      doc = resolved.document;
    } else if ('document' in input && input.document) {
      doc = input.document;
    } else {
      doc = input;
    }

    // Upsert into local database
    const upserted = await DocumentRepository.upsert({
      id: doc.id,
      name: doc.name,
      uri: doc.uri,
      path: 'path' in doc && doc.path ? doc.path : doc.uri.replace('file://', ''),
      size: doc.size || 0,
      mimeType: doc.mimeType,
      extension: doc.extension,
      lastOpenedAt: Date.now(),
    });

    // Add to Recent list
    await RecentRepository.addRecent(upserted.id);

    // Resolve route and navigate
    const route = this.resolveRoute(upserted);

    if (navigation && typeof navigation.navigate === 'function') {
      navigation.navigate(route.screen, route.params);
    }

    return route;
  }
}

export default EditorRouter;
