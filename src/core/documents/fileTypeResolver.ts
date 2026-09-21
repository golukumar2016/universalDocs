/**
 * FileTypeResolver
 * 
 * Reusable file-type resolver responsible for identifying:
 * - File name
 * - Extension
 * - MIME type
 * - Supported / unsupported status
 */

export type SupportedDocumentType =
  | 'PDF'
  | 'TXT'
  | 'CSV'
  | 'DOC'
  | 'DOCX'
  | 'XLS'
  | 'XLSX'
  | 'PPT'
  | 'PPTX'
  | 'MD';

export type DocumentCategoryType = SupportedDocumentType | 'UNSUPPORTED';

export interface FileTypeInfo {
  type: DocumentCategoryType;
  extension: string;
  mimeType: string;
  isSupported: boolean;
  displayName: string;
}

// Extension to MIME type mapping for supported document formats
const EXTENSION_TO_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  txt: 'text/plain',
  text: 'text/plain',
  log: 'text/plain',
  csv: 'text/csv',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  md: 'text/markdown',
  markdown: 'text/markdown',
};

// Extension to Document Type mapping
const EXTENSION_TO_TYPE: Record<string, SupportedDocumentType> = {
  pdf: 'PDF',
  txt: 'TXT',
  text: 'TXT',
  log: 'TXT',
  csv: 'CSV',
  doc: 'DOC',
  docx: 'DOCX',
  xls: 'XLS',
  xlsx: 'XLSX',
  ppt: 'PPT',
  pptx: 'PPTX',
  md: 'MD',
  markdown: 'MD',
};

// MIME type to Extension fallback mapping
const MIME_TO_EXTENSION: Record<string, string> = {
  'application/pdf': 'pdf',
  'text/plain': 'txt',
  'text/csv': 'csv',
  'text/comma-separated-values': 'csv',
  'application/csv': 'csv',
  'application/x-csv': 'csv',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'text/markdown': 'md',
  'text/x-markdown': 'md',
};

export class FileTypeResolver {
  /**
   * Extracts clean filename from a URI or path string.
   */
  public static extractFileName(uriOrPath: string): string {
    if (!uriOrPath) return 'untitled_document';

    let cleaned = uriOrPath;

    // Decode URI encoding if present
    try {
      cleaned = decodeURIComponent(cleaned);
    } catch {
      // Ignore decoding failure and continue with raw string
    }

    // Strip trailing slashes or queries
    const queryIndex = cleaned.indexOf('?');
    if (queryIndex !== -1) {
      cleaned = cleaned.substring(0, queryIndex);
    }

    // Extract after last forward slash or colon (Android content URIs often have ID after colon)
    const forwardSlash = cleaned.lastIndexOf('/');
    let name = forwardSlash !== -1 ? cleaned.substring(forwardSlash + 1) : cleaned;

    // If still contains colon (e.g. primary:Download/file.pdf), take after colon
    const colon = name.lastIndexOf(':');
    if (colon !== -1) {
      const afterColon = name.substring(colon + 1);
      if (afterColon.includes('.') || afterColon.length > 0) {
        name = afterColon;
      }
    }

    return name || 'untitled_document';
  }

  /**
   * Extracts normalized lowercase extension (without dot).
   */
  public static extractExtension(fileNameOrUri: string): string {
    if (!fileNameOrUri) return '';
    const cleanName = this.extractFileName(fileNameOrUri);
    const dotIndex = cleanName.lastIndexOf('.');
    if (dotIndex === -1 || dotIndex === cleanName.length - 1) {
      return '';
    }
    return cleanName.substring(dotIndex + 1).toLowerCase().trim();
  }

  /**
   * Resolves comprehensive file type information.
   * Never throws; handles unknown and malformed files gracefully.
   */
  public static resolveFileType(fileNameOrUri: string, mimeType?: string): FileTypeInfo {
    const rawExtension = this.extractExtension(fileNameOrUri);
    const normalizedMime = (mimeType || '').trim().toLowerCase();

    // 1. Try extension match first
    if (rawExtension && EXTENSION_TO_TYPE[rawExtension]) {
      const type = EXTENSION_TO_TYPE[rawExtension];
      const standardMime = EXTENSION_TO_MIME[rawExtension] || normalizedMime || 'application/octet-stream';
      return {
        type,
        extension: rawExtension,
        mimeType: standardMime,
        isSupported: true,
        displayName: `${type} Document`,
      };
    }

    // 2. Try MIME type match if extension did not match
    if (normalizedMime && MIME_TO_EXTENSION[normalizedMime]) {
      const ext = MIME_TO_EXTENSION[normalizedMime];
      const type = EXTENSION_TO_TYPE[ext];
      return {
        type,
        extension: rawExtension || ext,
        mimeType: normalizedMime,
        isSupported: true,
        displayName: `${type} Document`,
      };
    }

    // 3. Fallback for text/* mime types
    if (normalizedMime.startsWith('text/')) {
      return {
        type: 'TXT',
        extension: rawExtension || 'txt',
        mimeType: normalizedMime,
        isSupported: true,
        displayName: 'Text Document',
      };
    }

    // 4. Unsupported format
    const fallbackExt = rawExtension || 'bin';
    const fallbackMime = normalizedMime || 'application/octet-stream';
    const displayExt = fallbackExt.toUpperCase();

    return {
      type: 'UNSUPPORTED',
      extension: fallbackExt,
      mimeType: fallbackMime,
      isSupported: false,
      displayName: `Unsupported (${displayExt})`,
    };
  }

  /**
   * Checks if a file or MIME type is supported by UniversalDocs.
   */
  public static isSupported(fileNameOrUri: string, mimeType?: string): boolean {
    return this.resolveFileType(fileNameOrUri, mimeType).isSupported;
  }

  /**
   * Gets list of supported extensions.
   */
  public static getSupportedExtensions(): string[] {
    return Object.keys(EXTENSION_TO_TYPE);
  }
}

export default FileTypeResolver;
