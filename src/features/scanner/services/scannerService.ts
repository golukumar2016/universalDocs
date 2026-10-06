import { NativeModules } from 'react-native';
import {
  ScanCornerPoint,
  ScanDocumentCorners,
  ScanPage,
  EnhancementMode,
  ScannerSession,
  EdgeDetectionResult,
  CropTransformResult,
} from '../types/scanner.types';

const { DocumentScannerModule } = NativeModules;

export class ScannerService {
  /**
   * Generates a dynamic default filename: Scanned_Document_YYYY-MM-DD.pdf
   */
  public static generateDefaultFileName(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `Scanned_Document_${year}-${month}-${day}.pdf`;
  }

  /**
   * Initializes a new clean scanner session.
   */
  public static createSession(): ScannerSession {
    return {
      id: `scan_session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      pages: [],
      createdAt: Date.now(),
    };
  }

  /**
   * Adds a page to the current scan session.
   */
  public static addPage(session: ScannerSession, page: ScanPage): ScannerSession {
    return {
      ...session,
      pages: [...session.pages, page],
    };
  }

  /**
   * Removes a page from the scan session by ID.
   */
  public static removePage(session: ScannerSession, pageId: string): ScannerSession {
    return {
      ...session,
      pages: session.pages.filter(p => p.id !== pageId),
    };
  }

  /**
   * Reorders pages by moving an item from one index to another.
   */
  public static reorderPages(
    session: ScannerSession,
    fromIndex: number,
    toIndex: number
  ): ScannerSession {
    if (
      fromIndex < 0 ||
      fromIndex >= session.pages.length ||
      toIndex < 0 ||
      toIndex >= session.pages.length
    ) {
      return session;
    }

    const pages = [...session.pages];
    const [moved] = pages.splice(fromIndex, 1);
    pages.splice(toIndex, 0, moved);

    return {
      ...session,
      pages,
    };
  }

  /**
   * Moves a page up or down by 1 position.
   */
  public static movePage(
    session: ScannerSession,
    pageId: string,
    direction: 'UP' | 'DOWN'
  ): ScannerSession {
    const index = session.pages.findIndex(p => p.id === pageId);
    if (index === -1) return session;

    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    return this.reorderPages(session, index, targetIndex);
  }

  /**
   * Updates an existing page in the session (e.g. after re-cropping or re-enhancing).
   */
  public static updatePage(session: ScannerSession, updatedPage: ScanPage): ScannerSession {
    return {
      ...session,
      pages: session.pages.map(p => (p.id === updatedPage.id ? updatedPage : p)),
    };
  }

  /**
   * Detects document boundaries or computes optimal crop margins for an image.
   */
  public static async detectDocumentEdges(imageUri: string): Promise<EdgeDetectionResult> {
    if (!DocumentScannerModule) {
      throw new Error('DocumentScannerModule is not registered.');
    }
    return await DocumentScannerModule.detectDocumentEdges(imageUri);
  }

  /**
   * Performs an authentic 4-corner perspective transformation onto a rectangular image.
   */
  public static async cropAndPerspectiveTransform(
    imageUri: string,
    corners: ScanDocumentCorners
  ): Promise<CropTransformResult> {
    if (!DocumentScannerModule) {
      throw new Error('DocumentScannerModule is not registered.');
    }
    return await DocumentScannerModule.cropAndPerspectiveTransform(imageUri, corners);
  }

  /**
   * Applies offline image enhancement mode locally.
   */
  public static async enhanceImage(
    imageUri: string,
    mode: EnhancementMode
  ): Promise<string> {
    if (!DocumentScannerModule) {
      throw new Error('DocumentScannerModule is not registered.');
    }
    return await DocumentScannerModule.enhanceImage(imageUri, mode);
  }

  /**
   * Rotates an image by degrees (90, 180, 270).
   */
  public static async rotateImage(
    imageUri: string,
    degrees: number
  ): Promise<string> {
    if (!DocumentScannerModule) {
      throw new Error('DocumentScannerModule is not registered.');
    }
    return await DocumentScannerModule.rotateImage(imageUri, degrees);
  }

  /**
   * Cleans up temporary scanner files created in cache.
   */
  public static async cleanupTemporaryImages(): Promise<boolean> {
    if (!DocumentScannerModule) return false;
    try {
      return await DocumentScannerModule.cleanupTemporaryImages();
    } catch {
      return false;
    }
  }
}

export const scannerService = ScannerService;
export default ScannerService;
