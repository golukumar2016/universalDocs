import { ScannerService } from '../../src/features/scanner/services/scannerService';
import { ScanPage, ScanDocumentCorners } from '../../src/features/scanner/types/scanner.types';
import { NativeModules } from 'react-native';

describe('ScannerService & Multi-Page Session Logic', () => {
  const dummyCorners: ScanDocumentCorners = {
    topLeft: { x: 50, y: 50 },
    topRight: { x: 950, y: 50 },
    bottomRight: { x: 950, y: 1350 },
    bottomLeft: { x: 50, y: 1350 },
  };

  const createDummyPage = (id: string): ScanPage => ({
    id,
    originalImagePath: `/mock/path/orig_${id}.jpg`,
    croppedImagePath: `/mock/path/cropped_${id}.jpg`,
    enhancedImagePath: `/mock/path/enhanced_${id}.jpg`,
    corners: dummyCorners,
    enhancementMode: 'ORIGINAL',
    rotation: 0,
    width: 900,
    height: 1300,
    timestamp: Date.now(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('generates dynamic default filename with current date YYYY-MM-DD', () => {
    const filename = ScannerService.generateDefaultFileName();
    expect(filename).toMatch(/^Scanned_Document_\d{4}-\d{2}-\d{2}\.pdf$/);
  });

  it('creates an empty scanner session', () => {
    const session = ScannerService.createSession();
    expect(session.id).toBeDefined();
    expect(session.pages).toEqual([]);
    expect(session.createdAt).toBeGreaterThan(0);
  });

  it('adds pages to the session and preserves count', () => {
    let session = ScannerService.createSession();
    expect(session.pages.length).toBe(0);

    const page1 = createDummyPage('page_1');
    session = ScannerService.addPage(session, page1);
    expect(session.pages.length).toBe(1);
    expect(session.pages[0].id).toBe('page_1');

    const page2 = createDummyPage('page_2');
    session = ScannerService.addPage(session, page2);
    expect(session.pages.length).toBe(2);
    expect(session.pages[1].id).toBe('page_2');
  });

  it('removes a page from the session by id', () => {
    let session = ScannerService.createSession();
    session = ScannerService.addPage(session, createDummyPage('p1'));
    session = ScannerService.addPage(session, createDummyPage('p2'));
    session = ScannerService.addPage(session, createDummyPage('p3'));
    expect(session.pages.length).toBe(3);

    session = ScannerService.removePage(session, 'p2');
    expect(session.pages.length).toBe(2);
    expect(session.pages.map(p => p.id)).toEqual(['p1', 'p3']);
  });

  it('reorders pages correctly (from index to index)', () => {
    let session = ScannerService.createSession();
    session = ScannerService.addPage(session, createDummyPage('p1'));
    session = ScannerService.addPage(session, createDummyPage('p2'));
    session = ScannerService.addPage(session, createDummyPage('p3'));

    // Move p3 from index 2 to index 0
    session = ScannerService.reorderPages(session, 2, 0);
    expect(session.pages.map(p => p.id)).toEqual(['p3', 'p1', 'p2']);
  });

  it('moves page UP and DOWN', () => {
    let session = ScannerService.createSession();
    session = ScannerService.addPage(session, createDummyPage('p1'));
    session = ScannerService.addPage(session, createDummyPage('p2'));
    session = ScannerService.addPage(session, createDummyPage('p3'));

    // Move p2 UP -> should become first
    session = ScannerService.movePage(session, 'p2', 'UP');
    expect(session.pages.map(p => p.id)).toEqual(['p2', 'p1', 'p3']);

    // Move p2 DOWN -> should return to middle
    session = ScannerService.movePage(session, 'p2', 'DOWN');
    expect(session.pages.map(p => p.id)).toEqual(['p1', 'p2', 'p3']);
  });

  it('updates an existing page in the session', () => {
    let session = ScannerService.createSession();
    const page = createDummyPage('p1');
    session = ScannerService.addPage(session, page);

    const updated = {
      ...page,
      enhancementMode: 'BLACK_AND_WHITE' as const,
      enhancedImagePath: '/mock/path/enhanced_bw_p1.jpg',
    };

    session = ScannerService.updatePage(session, updated);
    expect(session.pages[0].enhancementMode).toBe('BLACK_AND_WHITE');
    expect(session.pages[0].enhancedImagePath).toBe('/mock/path/enhanced_bw_p1.jpg');
  });

  it('invokes native detectDocumentEdges', async () => {
    const res = await ScannerService.detectDocumentEdges('/mock/test.jpg');
    expect(NativeModules.DocumentScannerModule.detectDocumentEdges).toHaveBeenCalledWith('/mock/test.jpg');
    expect(res.width).toBe(1200);
    expect(res.corners.topLeft).toBeDefined();
  });

  it('invokes native cropAndPerspectiveTransform', async () => {
    const res = await ScannerService.cropAndPerspectiveTransform('/mock/test.jpg', dummyCorners);
    expect(NativeModules.DocumentScannerModule.cropAndPerspectiveTransform).toHaveBeenCalledWith(
      '/mock/test.jpg',
      dummyCorners
    );
    expect(res.imagePath).toContain('cropped');
  });

  it('invokes native enhanceImage with multiple filter modes', async () => {
    const modes = ['AUTO', 'GRAYSCALE', 'BLACK_AND_WHITE', 'HIGH_CONTRAST'] as const;
    for (const mode of modes) {
      const res = await ScannerService.enhanceImage('/mock/cropped.jpg', mode);
      expect(NativeModules.DocumentScannerModule.enhanceImage).toHaveBeenCalledWith('/mock/cropped.jpg', mode);
      expect(res).toContain(mode);
    }
  });

  it('invokes native rotateImage', async () => {
    const res = await ScannerService.rotateImage('/mock/test.jpg', 90);
    expect(NativeModules.DocumentScannerModule.rotateImage).toHaveBeenCalledWith('/mock/test.jpg', 90);
    expect(res).toContain('rotated');
  });

  it('calls cleanupTemporaryImages', async () => {
    const res = await ScannerService.cleanupTemporaryImages();
    expect(NativeModules.DocumentScannerModule.cleanupTemporaryImages).toHaveBeenCalled();
    expect(res).toBe(true);
  });
});
