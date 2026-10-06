import { NativeModules } from 'react-native';
import { PdfGenerationService } from '../../src/features/scanner/services/pdfGenerationService';
import { ScanPage } from '../../src/features/scanner/types/scanner.types';
import { DocumentRepository } from '../../src/core/database/repositories/documentRepository';
import { RecentRepository } from '../../src/core/database/repositories/recentRepository';
import { EditorRouter } from '../../src/features/editor/services/editorRouter';

describe('PdfGenerationService & PDF Pipeline Integration', () => {
  const dummyPages: ScanPage[] = [
    {
      id: 'page_1',
      originalImagePath: '/mock/path/orig_1.jpg',
      croppedImagePath: '/mock/path/cropped_1.jpg',
      enhancedImagePath: '/mock/path/enhanced_1.jpg',
      corners: {
        topLeft: { x: 0, y: 0 },
        topRight: { x: 800, y: 0 },
        bottomRight: { x: 800, y: 1200 },
        bottomLeft: { x: 0, y: 1200 },
      },
      enhancementMode: 'ORIGINAL',
      rotation: 0,
      width: 800,
      height: 1200,
      timestamp: Date.now(),
    },
    {
      id: 'page_2',
      originalImagePath: '/mock/path/orig_2.jpg',
      croppedImagePath: '/mock/path/cropped_2.jpg',
      enhancedImagePath: '/mock/path/enhanced_2.jpg',
      corners: {
        topLeft: { x: 0, y: 0 },
        topRight: { x: 800, y: 0 },
        bottomRight: { x: 800, y: 1200 },
        bottomLeft: { x: 0, y: 1200 },
      },
      enhancementMode: 'BLACK_AND_WHITE',
      rotation: 0,
      width: 800,
      height: 1200,
      timestamp: Date.now(),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects PDF generation when pages array is empty', async () => {
    await expect(PdfGenerationService.generateAndSavePdf([])).rejects.toThrow(
      'No scanned pages provided'
    );
  });

  it('generates multi-page PDF, registers in SQLite, and cleans cache', async () => {
    const { document, pdfResult } = await PdfGenerationService.generateAndSavePdf(
      dummyPages,
      'My_Contract'
    );

    // Native module should be called with image paths in exact order
    expect(NativeModules.DocumentScannerModule.generatePdfFromImages).toHaveBeenCalledWith(
      ['/mock/path/enhanced_1.jpg', '/mock/path/enhanced_2.jpg'],
      'My_Contract.pdf'
    );

    // Verify metadata
    expect(pdfResult.fileName).toBe('My_Contract.pdf');
    expect(pdfResult.pageCount).toBe(2);
    expect(document.extension).toBe('pdf');
    expect(document.mimeType).toBe('application/pdf');

    // Verify document was registered in DocumentRepository
    const fromDb = await DocumentRepository.findById(document.id);
    expect(fromDb).not.toBeNull();
    expect(fromDb?.name).toBe('My_Contract.pdf');

    // Verify document was registered in RecentRepository
    const recents = await RecentRepository.getRecentDocuments(10);
    expect(recents.some(d => d.id === document.id)).toBe(true);

    // Verify cache cleanup was called
    expect(NativeModules.DocumentScannerModule.cleanupTemporaryImages).toHaveBeenCalled();
  });

  it('EditorRouter correctly routes the generated scanned PDF to DocumentViewer', () => {
    const scannedDoc = {
      id: 'doc_scan_test_1',
      name: 'Invoice_Scan.pdf',
      uri: 'file:///data/user/0/com.universaldocs/files/UniversalDocs/Invoice_Scan.pdf',
      path: '/data/user/0/com.universaldocs/files/UniversalDocs/Invoice_Scan.pdf',
      size: 450000,
      mimeType: 'application/pdf',
      extension: 'pdf',
      folderId: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastOpenedAt: Date.now(),
      isFavorite: false,
      isSecured: false,
    };

    const routeTarget = EditorRouter.resolveRoute(scannedDoc);
    expect(routeTarget.type).toBe('pdf');
    expect(routeTarget.screen).toBe('DocumentViewer');
    expect(routeTarget.params.document.name).toBe('Invoice_Scan.pdf');
  });
});
