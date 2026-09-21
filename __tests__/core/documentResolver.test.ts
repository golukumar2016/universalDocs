import { FileTypeResolver } from '../../src/core/documents/fileTypeResolver';
import { DocumentResolver } from '../../src/core/documents/documentResolver';

describe('FileTypeResolver', () => {
  describe('PDF resolution', () => {
    it('correctly resolves a PDF file by extension', () => {
      const info = FileTypeResolver.resolveFileType('Resume.pdf');
      expect(info.type).toBe('PDF');
      expect(info.extension).toBe('pdf');
      expect(info.mimeType).toBe('application/pdf');
      expect(info.isSupported).toBe(true);
      expect(info.displayName).toBe('PDF Document');
    });

    it('correctly resolves a PDF file by MIME type fallback', () => {
      const info = FileTypeResolver.resolveFileType('document_without_ext', 'application/pdf');
      expect(info.type).toBe('PDF');
      expect(info.extension).toBe('pdf');
      expect(info.isSupported).toBe(true);
    });
  });

  describe('TXT resolution', () => {
    it('correctly resolves a TXT file', () => {
      const info = FileTypeResolver.resolveFileType('notes.txt');
      expect(info.type).toBe('TXT');
      expect(info.extension).toBe('txt');
      expect(info.mimeType).toBe('text/plain');
      expect(info.isSupported).toBe(true);
    });

    it('correctly resolves a text/* MIME type', () => {
      const info = FileTypeResolver.resolveFileType('unknown_file', 'text/plain');
      expect(info.type).toBe('TXT');
      expect(info.isSupported).toBe(true);
    });
  });

  describe('Office and Other Formats resolution', () => {
    it('resolves DOC and DOCX', () => {
      const doc = FileTypeResolver.resolveFileType('document.doc');
      expect(doc.type).toBe('DOC');
      expect(doc.isSupported).toBe(true);

      const docx = FileTypeResolver.resolveFileType('document.docx');
      expect(docx.type).toBe('DOCX');
      expect(docx.isSupported).toBe(true);
    });

    it('resolves XLS and XLSX', () => {
      const xls = FileTypeResolver.resolveFileType('sheet.xls');
      expect(xls.type).toBe('XLS');
      expect(xls.isSupported).toBe(true);

      const xlsx = FileTypeResolver.resolveFileType('sheet.xlsx');
      expect(xlsx.type).toBe('XLSX');
      expect(xlsx.isSupported).toBe(true);
    });

    it('resolves PPT and PPTX', () => {
      const ppt = FileTypeResolver.resolveFileType('slides.ppt');
      expect(ppt.type).toBe('PPT');
      expect(ppt.isSupported).toBe(true);

      const pptx = FileTypeResolver.resolveFileType('slides.pptx');
      expect(pptx.type).toBe('PPTX');
      expect(pptx.isSupported).toBe(true);
    });

    it('resolves CSV', () => {
      const csv = FileTypeResolver.resolveFileType('data.csv');
      expect(csv.type).toBe('CSV');
      expect(csv.isSupported).toBe(true);
    });
  });

  describe('Unsupported files', () => {
    it('handles unsupported extension gracefully without crashing', () => {
      const info = FileTypeResolver.resolveFileType('example.xyz');
      expect(info.type).toBe('UNSUPPORTED');
      expect(info.extension).toBe('xyz');
      expect(info.isSupported).toBe(false);
      expect(info.displayName).toBe('Unsupported (XYZ)');
    });

    it('handles unsupported MIME type gracefully without crashing', () => {
      const info = FileTypeResolver.resolveFileType('archive.bin', 'application/x-binary');
      expect(info.type).toBe('UNSUPPORTED');
      expect(info.isSupported).toBe(false);
    });
  });

  describe('URI extraction', () => {
    it('extracts filename from path', () => {
      expect(FileTypeResolver.extractFileName('/storage/emulated/0/Download/Resume.pdf')).toBe('Resume.pdf');
    });

    it('extracts filename from encoded URL', () => {
      expect(FileTypeResolver.extractFileName('content://media/external/file/Resume%202026.pdf')).toBe('Resume 2026.pdf');
    });

    it('extracts filename from colon formatted content URI', () => {
      expect(FileTypeResolver.extractFileName('content://com.android.providers.downloads.documents/document/raw%3A%2Fstorage%2Femulated%2F0%2FDownload%2Freport.pdf')).toBe('report.pdf');
    });
  });
});

describe('DocumentResolver', () => {
  it('resolves a content:// URI intent into a Document model', () => {
    const rawIntent = {
      uri: 'content://com.android.providers.media.documents/document/document%3A1001',
      name: 'FinancialReport.pdf',
      mimeType: 'application/pdf',
      size: 204800,
      scheme: 'content',
      action: 'android.intent.action.VIEW',
    };

    const resolved = DocumentResolver.resolveDocument(rawIntent);
    expect(resolved.isSupported).toBe(true);
    expect(resolved.source).toBe('content');
    expect(resolved.document.name).toBe('FinancialReport.pdf');
    expect(resolved.document.extension).toBe('pdf');
    expect(resolved.document.mimeType).toBe('application/pdf');
    expect(resolved.document.size).toBe(204800);
    expect(resolved.document.id).toBeDefined();
    expect(resolved.fileTypeInfo.type).toBe('PDF');
  });

  it('resolves a file:// URI intent correctly', () => {
    const rawIntent = {
      uri: 'file:///sdcard/Download/test_notes.txt',
      scheme: 'file',
      action: 'android.intent.action.VIEW',
    };

    const resolved = DocumentResolver.resolveDocument(rawIntent);
    expect(resolved.isSupported).toBe(true);
    expect(resolved.source).toBe('file');
    expect(resolved.document.name).toBe('test_notes.txt');
    expect(resolved.document.extension).toBe('txt');
    expect(resolved.document.mimeType).toBe('text/plain');
    expect(resolved.fileTypeInfo.type).toBe('TXT');
  });

  it('handles an unsupported file without error', () => {
    const rawIntent = {
      uri: 'file:///sdcard/Download/example.xyz',
      action: 'android.intent.action.VIEW',
    };

    const resolved = DocumentResolver.resolveDocument(rawIntent);
    expect(resolved.isSupported).toBe(false);
    expect(resolved.fileTypeInfo.type).toBe('UNSUPPORTED');
    expect(resolved.document.name).toBe('example.xyz');
    expect(resolved.document.extension).toBe('xyz');
  });
});
