import { AnnotationService } from '../../src/features/documents/pdf/annotations/annotationService';
import { DocumentRepository } from '../../src/core/database/repositories/documentRepository';
import { RecentRepository } from '../../src/core/database/repositories/recentRepository';
import { NativeModules } from 'react-native';

describe('AnnotationService', () => {
  const pageWidth = 600;
  const pageHeight = 800;

  describe('Coordinate Normalization', () => {
    it('normalizes points to 0..1 range accurately', () => {
      const pt = AnnotationService.normalizePoint(300, 400, pageWidth, pageHeight);
      expect(pt.x).toBeCloseTo(0.5);
      expect(pt.y).toBeCloseTo(0.5);

      // Clamp out-of-bounds coordinates
      const clampedPt = AnnotationService.normalizePoint(-50, 950, pageWidth, pageHeight);
      expect(clampedPt.x).toBe(0);
      expect(clampedPt.y).toBe(1);
    });

    it('denormalizes points back to exact pixels', () => {
      const denorm = AnnotationService.denormalizePoint({ x: 0.25, y: 0.75 }, pageWidth, pageHeight);
      expect(denorm.x).toBe(150);
      expect(denorm.y).toBe(600);
    });

    it('normalizes rects created with positive drag (top-left to bottom-right)', () => {
      const rect = AnnotationService.normalizeRect(60, 80, 120, 160, pageWidth, pageHeight);
      expect(rect.x).toBeCloseTo(0.1);
      expect(rect.y).toBeCloseTo(0.1);
      expect(rect.width).toBeCloseTo(0.2);
      expect(rect.height).toBeCloseTo(0.2);
    });

    it('normalizes rects created with negative drag (bottom-right to top-left)', () => {
      const rect = AnnotationService.normalizeRect(180, 240, -120, -160, pageWidth, pageHeight);
      expect(rect.x).toBeCloseTo(0.1);
      expect(rect.y).toBeCloseTo(0.1);
      expect(rect.width).toBeCloseTo(0.2);
      expect(rect.height).toBeCloseTo(0.2);
    });

    it('denormalizes rect back to pixels', () => {
      const denorm = AnnotationService.denormalizeRect(
        { x: 0.2, y: 0.3, width: 0.5, height: 0.1 },
        pageWidth,
        pageHeight
      );
      expect(denorm.x).toBe(120);
      expect(denorm.y).toBe(240);
      expect(denorm.width).toBe(300);
      expect(denorm.height).toBe(80);
    });
  });

  describe('Factory Creators', () => {
    const docId = 'doc_test_1';
    const bounds = { x: 0.1, y: 0.2, width: 0.3, height: 0.05 };

    it('creates a highlight annotation with correct defaults', () => {
      const annot = AnnotationService.createHighlight(docId, 0, bounds, '#FACC15');
      expect(annot.type).toBe('highlight');
      expect(annot.documentId).toBe(docId);
      expect(annot.pageIndex).toBe(0);
      expect(annot.style.color).toBe('#FACC15');
      expect(annot.style.opacity).toBeGreaterThan(0);
      expect(annot.bounds).toEqual(bounds);
    });

    it('creates an underline annotation with stroke width', () => {
      const annot = AnnotationService.createUnderline(docId, 1, bounds, '#2563EB', 3.0);
      expect(annot.type).toBe('underline');
      expect(annot.style.strokeWidth).toBe(3.0);
      expect(annot.style.color).toBe('#2563EB');
    });

    it('creates a strikethrough annotation', () => {
      const annot = AnnotationService.createStrikethrough(docId, 0, bounds, '#DC2626');
      expect(annot.type).toBe('strikethrough');
      expect(annot.style.color).toBe('#DC2626');
    });

    it('creates a freehand ink annotation with points', () => {
      const points = [{ x: 0.1, y: 0.1 }, { x: 0.15, y: 0.18 }];
      const annot = AnnotationService.createInk(docId, 2, points, '#1E293B', 2.5);
      expect(annot.type).toBe('ink');
      expect(annot.points).toHaveLength(2);
      expect(annot.style.strokeWidth).toBe(2.5);
    });

    it('creates a sticky note annotation with content', () => {
      const point = { x: 0.4, y: 0.5 };
      const annot = AnnotationService.createNote(docId, 0, point, 'Important note here', '#F59E0B');
      expect(annot.type).toBe('note');
      expect(annot.text).toBe('Important note here');
      expect(annot.bounds?.x).toBe(0.4);
      expect(annot.bounds?.y).toBe(0.5);
    });
  });

  describe('Export and Native Bridge Integration', () => {
    it('calls native module and registers document in SQLite DocumentRepository and Recents', async () => {
      const originalUri = 'file:///mock/storage/original.pdf';
      const annotations = [
        AnnotationService.createHighlight('doc_1', 0, { x: 0.1, y: 0.1, width: 0.5, height: 0.05 }),
      ];

      const res = await AnnotationService.exportAndSaveAnnotatedPdf(
        originalUri,
        annotations,
        'MyAnnotated_Doc.pdf'
      );

      expect(NativeModules.PdfAnnotationModule.generateAnnotatedPdf).toHaveBeenCalledWith(
        originalUri,
        expect.any(String),
        'MyAnnotated_Doc.pdf'
      );

      expect(res.result.fileName).toBe('MyAnnotated_Doc.pdf');
      expect(res.documentItem.name).toBe('MyAnnotated_Doc.pdf');

      // Verify persistence in SQLite
      const found = await DocumentRepository.findById(res.documentItem.id);
      expect(found).not.toBeNull();
      expect(found?.name).toBe('MyAnnotated_Doc.pdf');

      // Verify recents
      const recents = await RecentRepository.getRecentDocuments(5);
      expect(recents.some(r => r.id === res.documentItem.id)).toBe(true);
    });

    it('loads and saves sidecar metadata', async () => {
      const saveOk = await AnnotationService.saveAnnotations('doc_1', []);
      expect(saveOk).toBe(true);

      const loaded = await AnnotationService.loadAnnotations('doc_1');
      expect(loaded).toEqual([]);
    });
  });
});
