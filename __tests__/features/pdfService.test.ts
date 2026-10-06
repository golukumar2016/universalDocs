import { NativeModules } from 'react-native';
import { pdfService, PdfService } from '../../src/features/documents/pdf/pdfService';
import { pdfDocumentEngine } from '../../src/core/engines/pdfEngine';
import { engineRegistry } from '../../src/core/engines/engineRegistry';
import { DocumentItem } from '../../src/shared/types';

describe('PdfService & Offline PDF Engine', () => {
  const mockPdfDoc: DocumentItem = {
    id: 'doc_pdf_123',
    name: 'TestReport.pdf',
    uri: 'file:///data/user/0/com.universaldocs/files/TestReport.pdf',
    path: '/data/user/0/com.universaldocs/files/TestReport.pdf',
    size: 2048576,
    mimeType: 'application/pdf',
    extension: 'pdf',
    folderId: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    lastOpenedAt: null,
    isFavorite: false,
    isSecured: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('pdfService.openPdf', () => {
    it('successfully opens a local PDF and returns session with pages', async () => {
      (NativeModules.PdfRendererModule.openPdf as jest.Mock).mockResolvedValueOnce({
        docId: 'doc_pdf_123',
        pageCount: 3,
        pages: [
          { pageIndex: 0, width: 595, height: 842, aspectRatio: 595 / 842 },
          { pageIndex: 1, width: 595, height: 842, aspectRatio: 595 / 842 },
          { pageIndex: 2, width: 595, height: 842, aspectRatio: 595 / 842 },
        ],
      });

      const session = await pdfService.openPdf(mockPdfDoc.uri);

      expect(NativeModules.PdfRendererModule.openPdf).toHaveBeenCalledWith(
        mockPdfDoc.uri
      );
      expect(session.docId).toBe('doc_pdf_123');
      expect(session.pageCount).toBe(3);
      expect(session.pages.length).toBe(3);
      expect(session.pages[0].aspectRatio).toBeCloseTo(595 / 842);
    });

    it('handles content:// URIs seamlessly', async () => {
      const contentUri = 'content://com.android.providers.downloads.documents/document/123';
      (NativeModules.PdfRendererModule.openPdf as jest.Mock).mockResolvedValueOnce({
        docId: 'content_123',
        pageCount: 1,
        pages: [{ pageIndex: 0, width: 612, height: 792, aspectRatio: 612 / 792 }],
      });

      const session = await pdfService.openPdf(contentUri);
      expect(NativeModules.PdfRendererModule.openPdf).toHaveBeenCalledWith(
        contentUri
      );
      expect(session.pageCount).toBe(1);
    });

    it('identifies and throws PASSWORD_PROTECTED error', async () => {
      (NativeModules.PdfRendererModule.openPdf as jest.Mock).mockRejectedValueOnce(
        new Error('PASSWORD_PROTECTED: This document is encrypted with a password')
      );

      await expect(pdfService.openPdf(mockPdfDoc.uri)).rejects.toMatchObject({
        type: 'PASSWORD_PROTECTED',
      });
    });

    it('identifies and throws NOT_FOUND error', async () => {
      (NativeModules.PdfRendererModule.openPdf as jest.Mock).mockRejectedValueOnce(
        new Error('NOT_FOUND: PDF file does not exist at uri')
      );

      await expect(pdfService.openPdf(mockPdfDoc.uri)).rejects.toMatchObject({
        type: 'NOT_FOUND',
      });
    });

    it('identifies and throws INVALID_PDF error for corrupt files', async () => {
      (NativeModules.PdfRendererModule.openPdf as jest.Mock).mockRejectedValueOnce(
        new Error('INVALID_PDF: Header not valid')
      );

      await expect(pdfService.openPdf(mockPdfDoc.uri)).rejects.toMatchObject({
        type: 'INVALID_PDF',
      });
    });
  });

  describe('pdfService.renderPage', () => {
    it('requests native rendering and returns rendered page URI', async () => {
      (NativeModules.PdfRendererModule.renderPage as jest.Mock).mockResolvedValueOnce(
        'file:///mock/cache/doc_pdf_123/page_1.png'
      );

      const uri = await pdfService.renderPage('doc_pdf_123', 1);

      expect(NativeModules.PdfRendererModule.renderPage).toHaveBeenCalledWith(
        'doc_pdf_123',
        1,
        0,
        0
      );
      expect(uri).toBe('file:///mock/cache/doc_pdf_123/page_1.png');
    });
  });

  describe('pdfService.closePdf', () => {
    it('calls native closePdf and frees resources', async () => {
      await pdfService.closePdf('doc_pdf_123');
      expect(NativeModules.PdfRendererModule.closePdf).toHaveBeenCalledWith('doc_pdf_123');
    });
  });

  describe('pdfService.validatePageJump', () => {
    it('validates and converts input string within bounds', () => {
      const valid = pdfService.validatePageJump('5', 10);
      expect(valid.valid).toBe(true);
      expect(valid.targetPage).toBe(5);
    });

    it('rejects page numbers less than 1', () => {
      const invalid = pdfService.validatePageJump('0', 10);
      expect(invalid.valid).toBe(false);
      expect(invalid.error).toBeDefined();
    });

    it('rejects page numbers greater than total pages', () => {
      const invalid = pdfService.validatePageJump('15', 10);
      expect(invalid.valid).toBe(false);
      expect(invalid.error).toContain('1 and 10');
    });

    it('rejects non-numeric input', () => {
      const invalid = pdfService.validatePageJump('abc', 10);
      expect(invalid.valid).toBe(false);
      expect(invalid.error).toContain('valid number');
    });
  });

  describe('pdfDocumentEngine & EngineRegistry', () => {
    it('pdfDocumentEngine handles pdf extension', () => {
      expect(pdfDocumentEngine.supportedExtensions).toContain('pdf');
      expect(pdfDocumentEngine.supports('pdf')).toBe(true);
      expect(pdfDocumentEngine.supports('txt')).toBe(false);
    });

    it('pdfDocumentEngine is registered in engineRegistry', () => {
      const registered = engineRegistry.getEngineForFile('pdf');
      expect(registered).toBeDefined();
      expect(registered?.id).toBe('pdf-engine');
    });

    it('loads content description via pdfDocumentEngine', async () => {
      (NativeModules.PdfRendererModule.openPdf as jest.Mock).mockResolvedValueOnce({
        docId: mockPdfDoc.id,
        pageCount: 5,
        pages: [
          { pageIndex: 0, width: 595, height: 842, aspectRatio: 595 / 842 },
          { pageIndex: 1, width: 595, height: 842, aspectRatio: 595 / 842 },
        ],
      });

      const content = await pdfDocumentEngine.loadContent(mockPdfDoc.path);
      expect(content).toContain('5 pages');
    });
  });
});
