import { EditorRouter } from '../../src/features/editor/services/editorRouter';
import { Document, DocumentItem } from '../../src/shared/types';
import { RecentRepository } from '../../src/core/database/repositories/recentRepository';
import { DocumentRepository } from '../../src/core/database/repositories/documentRepository';

describe('EditorRouter', () => {
  it('routes .txt files to TXT Editor', () => {
    const doc: Document = {
      id: 'doc_1',
      name: 'Notes.txt',
      uri: 'file:///path/Notes.txt',
      mimeType: 'text/plain',
      extension: 'txt',
    };

    const route = EditorRouter.resolveRoute(doc);
    expect(route.type).toBe('txt');
    expect(route.screen).toBe('Editor');
    expect(route.params.documentId).toBe('doc_1');
  });

  it('routes .md markdown files to TXT Editor', () => {
    const doc: Document = {
      id: 'doc_2',
      name: 'README.md',
      uri: 'file:///path/README.md',
      mimeType: 'text/markdown',
      extension: 'md',
    };

    const route = EditorRouter.resolveRoute(doc);
    expect(route.type).toBe('txt');
    expect(route.screen).toBe('Editor');
  });

  it('routes .pdf files to PDF DocumentViewer flow', () => {
    const doc: Document = {
      id: 'doc_pdf',
      name: 'Invoice.pdf',
      uri: 'file:///path/Invoice.pdf',
      mimeType: 'application/pdf',
      extension: 'pdf',
    };

    const route = EditorRouter.resolveRoute(doc);
    expect(route.type).toBe('pdf');
    expect(route.screen).toBe('DocumentViewer');
  });

  it('routes .docx files to unsupported editor flow with informative message', () => {
    const doc: Document = {
      id: 'doc_word',
      name: 'Essay.docx',
      uri: 'file:///path/Essay.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      extension: 'docx',
    };

    const route = EditorRouter.resolveRoute(doc);
    expect(route.type).toBe('unsupported');
    expect(route.screen).toBe('UnsupportedDocument');
    if (route.type === 'unsupported') {
      expect(route.reason).toContain('Word document');
    }
  });

  it('routes .xlsx files to unsupported editor flow with informative message', () => {
    const doc: Document = {
      id: 'doc_excel',
      name: 'Budget.xlsx',
      uri: 'file:///path/Budget.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      extension: 'xlsx',
    };

    const route = EditorRouter.resolveRoute(doc);
    expect(route.type).toBe('unsupported');
    expect(route.screen).toBe('UnsupportedDocument');
    if (route.type === 'unsupported') {
      expect(route.reason).toContain('Spreadsheet');
    }
  });

  it('routes .pptx files to unsupported editor flow with informative message', () => {
    const doc: Document = {
      id: 'doc_ppt',
      name: 'Slides.pptx',
      uri: 'file:///path/Slides.pptx',
      mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      extension: 'pptx',
    };

    const route = EditorRouter.resolveRoute(doc);
    expect(route.type).toBe('unsupported');
    expect(route.screen).toBe('UnsupportedDocument');
    if (route.type === 'unsupported') {
      expect(route.reason).toContain('Presentation');
    }
  });

  it('openDocument automatically registers document and adds to Recents', async () => {
    const mockNavigation = {
      navigate: jest.fn(),
    };

    const doc: Document = {
      id: 'doc_router_auto',
      name: 'QuickNotes.txt',
      uri: 'file:///path/QuickNotes.txt',
      mimeType: 'text/plain',
      extension: 'txt',
    };

    await EditorRouter.openDocument(mockNavigation, doc);

    // Verify navigation was called to Editor
    expect(mockNavigation.navigate).toHaveBeenCalledWith(
      'Editor',
      expect.objectContaining({
        title: 'QuickNotes.txt',
      })
    );

    // Verify document was registered in repository
    const found = await DocumentRepository.findByUri('file:///path/QuickNotes.txt');
    expect(found).not.toBeNull();

    // Verify added to recent list
    const recents = await RecentRepository.getRecentDocuments(5);
    expect(recents.some((r) => r.name === 'QuickNotes.txt')).toBe(true);
  });
});
