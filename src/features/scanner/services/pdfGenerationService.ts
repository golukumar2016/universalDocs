import { NativeModules } from 'react-native';
import { DocumentItem } from '../../../shared/types';
import { DocumentRepository } from '../../../core/database/repositories/documentRepository';
import { RecentRepository } from '../../../core/database/repositories/recentRepository';
import { ScanPage, PdfGenerationResult } from '../types/scanner.types';
import { ScannerService } from './scannerService';

const { DocumentScannerModule } = NativeModules;

export class PdfGenerationService {
  /**
   * Generates a multi-page PDF from scanned pages in their exact final ordered sequence,
   * registers the document in SQLite DocumentRepository and RecentRepository,
   * cleans up temporary cache, and returns the DocumentItem ready to open.
   */
  public static async generateAndSavePdf(
    pages: ScanPage[],
    fileNameParam?: string
  ): Promise<{ document: DocumentItem; pdfResult: PdfGenerationResult }> {
    if (!pages || pages.length === 0) {
      throw new Error('Cannot generate PDF: No scanned pages provided.');
    }

    if (!DocumentScannerModule) {
      throw new Error('DocumentScannerModule is not registered.');
    }

    // Use enhancedImagePath for each page (or fallback to croppedImagePath)
    const imagePaths = pages.map(p => p.enhancedImagePath || p.croppedImagePath || p.originalImagePath);

    const defaultName = ScannerService.generateDefaultFileName();
    let finalFileName = (fileNameParam || defaultName).trim();
    if (!finalFileName.toLowerCase().endsWith('.pdf')) {
      finalFileName += '.pdf';
    }

    const pdfResult: PdfGenerationResult =
      await DocumentScannerModule.generatePdfFromImages(imagePaths, finalFileName);

    const now = Date.now();
    const docId = `doc_scan_${now}_${Math.random().toString(36).substring(2, 7)}`;

    const documentItem: DocumentItem = {
      id: docId,
      name: pdfResult.fileName,
      uri: pdfResult.uri,
      path: pdfResult.path,
      size: pdfResult.size,
      mimeType: 'application/pdf',
      extension: 'pdf',
      folderId: null,
      createdAt: now,
      updatedAt: now,
      lastOpenedAt: now,
      isFavorite: false,
      isSecured: false,
    };

    // Register in database
    await DocumentRepository.insert(documentItem);
    await RecentRepository.addRecent(docId);

    // Clean up temporary image files
    await ScannerService.cleanupTemporaryImages();

    return { document: documentItem, pdfResult };
  }
}

export const pdfGenerationService = PdfGenerationService;
export default PdfGenerationService;
