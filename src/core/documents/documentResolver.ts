/**
 * DocumentResolver
 * 
 * Responsible for converting incoming raw URI / intent data into a clean
 * Document model with resolved file type, MIME type, and support status.
 */

import { Document } from '../../shared/types';
import { FileTypeResolver, FileTypeInfo } from './fileTypeResolver';

export interface RawDocumentInput {
  uri: string;
  name?: string;
  mimeType?: string;
  size?: number;
  action?: string;
  scheme?: string;
}

export interface ResolvedDocument {
  document: Document;
  fileTypeInfo: FileTypeInfo;
  isSupported: boolean;
  source: 'content' | 'file' | 'external';
  action?: string;
  error?: string;
}

export class DocumentResolver {
  /**
   * Resolves raw document input (from Android Intent or file picker) into
   * a structured Document and ResolvedDocument object.
   */
  public static resolveDocument(input: RawDocumentInput): ResolvedDocument {
    if (!input || !input.uri) {
      throw new Error('DocumentResolver: URI must be provided');
    }

    const { uri, action, scheme } = input;

    // Determine filename
    let name = (input.name || '').trim();
    if (!name || name === 'document') {
      name = FileTypeResolver.extractFileName(uri);
    }

    // Determine file type info
    const fileTypeInfo = FileTypeResolver.resolveFileType(name, input.mimeType);

    // If filename has no extension but type is identified, append standard extension
    if (!name.includes('.') && fileTypeInfo.extension) {
      name = `${name}.${fileTypeInfo.extension}`;
    }

    // Determine source
    let source: 'content' | 'file' | 'external' = 'external';
    if (uri.startsWith('content://') || scheme === 'content') {
      source = 'content';
    } else if (uri.startsWith('file://') || scheme === 'file') {
      source = 'file';
    }

    // Generate unique ID
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const id = `doc_${Date.now()}_${randomSuffix}`;

    const document: Document = {
      id,
      name,
      uri,
      mimeType: fileTypeInfo.mimeType,
      extension: fileTypeInfo.extension,
      size: typeof input.size === 'number' && input.size >= 0 ? input.size : undefined,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    };

    return {
      document,
      fileTypeInfo,
      isSupported: fileTypeInfo.isSupported,
      source,
      action,
    };
  }

  /**
   * Resolves a plain URI string (with optional hints) into a ResolvedDocument.
   */
  public static resolveUri(
    uri: string,
    name?: string,
    mimeType?: string,
    size?: number
  ): ResolvedDocument {
    return this.resolveDocument({ uri, name, mimeType, size });
  }

  /**
   * Helper to create a new Document model instance.
   */
  public static createDocument(params: Partial<Document> & { uri: string; name: string }): Document {
    const fileTypeInfo = FileTypeResolver.resolveFileType(params.name, params.mimeType);
    const randomSuffix = Math.random().toString(36).substring(2, 8);

    return {
      id: params.id || `doc_${Date.now()}_${randomSuffix}`,
      name: params.name,
      uri: params.uri,
      mimeType: params.mimeType || fileTypeInfo.mimeType,
      extension: params.extension || fileTypeInfo.extension,
      size: params.size,
      createdAt: params.createdAt || Date.now(),
      modifiedAt: params.modifiedAt || Date.now(),
    };
  }
}

export default DocumentResolver;
