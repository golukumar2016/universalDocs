import { DocumentEngine } from './types';
import { PdfService } from '../../features/documents/pdf/pdfService';

export class PdfDocumentEngine implements DocumentEngine {
  readonly id = 'pdf-engine';
  readonly name = 'Native PDF Engine';
  readonly supportedExtensions = ['pdf'];
  readonly supportedMimeTypes = ['application/pdf'];

  supports(extension: string, mimeType?: string): boolean {
    const cleanExt = extension.toLowerCase().replace('.', '');
    if (this.supportedExtensions.includes(cleanExt)) return true;
    if (mimeType && this.supportedMimeTypes.includes(mimeType.toLowerCase())) return true;
    return false;
  }

  async loadContent(filePath: string): Promise<string> {
    const session = await PdfService.openPdf(filePath);
    return `PDF Document: ${session.pageCount} pages`;
  }

  async saveContent(_filePath: string, _content: string): Promise<void> {
    throw new Error('PDF editing and saving will be added in a future UniversalDocs release.');
  }

  async createNewFile(
    _directoryPath: string,
    _fileName: string,
    _initialContent?: string
  ): Promise<{ path: string; size: number }> {
    throw new Error('PDF creation will be added in the Document Scanner milestone.');
  }
}

export const pdfDocumentEngine = new PdfDocumentEngine();
export default pdfDocumentEngine;
