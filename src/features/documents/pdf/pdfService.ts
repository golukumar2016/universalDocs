import { NativeModules } from 'react-native';
import {
  PdfDocumentSession,
  PdfServiceError,
  PdfErrorType,
  PdfJumpValidationResult,
  PdfPageDimension,
} from './pdf.types';

const { PdfRendererModule } = NativeModules;

export class PdfService {
  /**
   * Opens a PDF document via the native renderer and returns page count and dimensions.
   */
  public static async openPdf(uriString: string): Promise<PdfDocumentSession> {
    if (!uriString || typeof uriString !== 'string') {
      throw this.createError(
        'FILE_NOT_FOUND',
        'Invalid or empty PDF URI provided.'
      );
    }

    if (!PdfRendererModule) {
      throw this.createError(
        'UNKNOWN',
        'Native PDF renderer module is not available.'
      );
    }

    try {
      const session = await PdfRendererModule.openPdf(uriString);
      const assignedDocId = session.documentId || session.docId || 'pdf_doc';
      const pages: PdfPageDimension[] = (session.pages || []).map((p: any, idx: number) => {
        const pageIdx = p.index != null ? p.index : (p.pageIndex != null ? p.pageIndex : idx);
        const w = p.width || 595;
        const h = p.height || 842;
        const ratio = p.aspectRatio || (h > 0 ? w / h : 595 / 842);
        return {
          index: pageIdx,
          pageIndex: pageIdx,
          pageNumber: p.pageNumber != null ? p.pageNumber : pageIdx + 1,
          width: w,
          height: h,
          aspectRatio: ratio,
        };
      });

      return {
        docId: assignedDocId,
        documentId: assignedDocId,
        pageCount: session.pageCount || pages.length,
        pages,
      };
    } catch (err: any) {
      throw this.mapNativeError(err);
    }
  }

  /**
   * Renders a specific page into a cached bitmap file and returns its file:// URI.
   */
  public static async renderPage(
    documentId: string,
    pageIndex: number,
    targetWidth: number = 0,
    targetHeight: number = 0
  ): Promise<string> {
    if (!PdfRendererModule) {
      throw this.createError('UNKNOWN', 'PdfRendererModule is not available.');
    }

    try {
      const res = await PdfRendererModule.renderPage(
        documentId,
        pageIndex,
        targetWidth,
        targetHeight
      );

      if (typeof res === 'string') {
        return res;
      }
      if (res && typeof res.imagePath === 'string') {
        return res.imagePath;
      }
      return String(res || '');
    } catch (err: any) {
      throw this.mapNativeError(err);
    }
  }

  /**
   * Closes the native PDF session and releases resources.
   */
  public static async closePdf(documentId: string): Promise<boolean> {
    if (!PdfRendererModule || !documentId) {
      return false;
    }

    try {
      return await PdfRendererModule.closePdf(documentId);
    } catch {
      return false;
    }
  }

  /**
   * Clears temporary PDF caches across sessions.
   */
  public static async clearAllCache(): Promise<boolean> {
    if (!PdfRendererModule) return false;
    try {
      return await PdfRendererModule.clearAllPdfCache();
    } catch {
      return false;
    }
  }

  /**
   * Validates user-entered page numbers for jumping.
   */
  public static validatePageJump(
    input: string,
    totalPages: number
  ): PdfJumpValidationResult {
    const trimmed = input.trim();
    if (!trimmed) {
      return { valid: false, error: 'Please enter a page number.' };
    }

    const num = parseInt(trimmed, 10);
    if (isNaN(num)) {
      return { valid: false, error: 'Page number must be a valid number.' };
    }

    if (num <= 0) {
      return { valid: false, error: 'Page number must be 1 or greater.' };
    }

    if (num > totalPages) {
      return {
        valid: false,
        error: `Page number must be between 1 and ${totalPages}.`,
      };
    }

    return { valid: true, pageNumber: num, targetPage: num };
  }

  private static mapNativeError(err: any): PdfServiceError {
    const code = (err?.code || '').toUpperCase();
    const rawMsg = (err?.message || '').toLowerCase();

    if (
      code === 'PASSWORD_PROTECTED' ||
      rawMsg.includes('password') ||
      rawMsg.includes('securityexception')
    ) {
      return this.createError(
        'PASSWORD_PROTECTED',
        'This PDF is encrypted with a password. UniversalDocs offline viewer currently supports unprotected PDF documents.',
        err
      );
    }

    if (
      code === 'INVALID_PDF' ||
      rawMsg.includes('invalid_pdf') ||
      rawMsg.includes('corrupted') ||
      rawMsg.includes('not a valid pdf') ||
      rawMsg.includes('header')
    ) {
      return this.createError(
        'INVALID_PDF',
        'Unable to open this PDF. The file may be corrupted or in an unsupported format.',
        err
      );
    }

    if (
      code === 'FILE_NOT_FOUND' ||
      code === 'NOT_FOUND' ||
      rawMsg.includes('not_found') ||
      rawMsg.includes('not exist') ||
      rawMsg.includes('not found') ||
      rawMsg.includes('filenotfoundexception')
    ) {
      return this.createError(
        'NOT_FOUND',
        'Unable to locate this PDF file. It may have been moved, renamed, or deleted.',
        err
      );
    }

    if (code === 'EMPTY_PDF' || rawMsg.includes('empty')) {
      return this.createError(
        'EMPTY_PDF',
        'The document contains no readable pages.',
        err
      );
    }

    return this.createError(
      'RENDER_ERROR',
      err?.message ||
        'Unable to open this PDF. The file may be unavailable, corrupted, or no longer accessible.',
      err
    );
  }

  private static createError(
    type: PdfErrorType,
    message: string,
    rawError?: any
  ): PdfServiceError {
    return {
      type,
      message,
      rawError,
    };
  }
}

export const pdfService = PdfService;
export default PdfService;
