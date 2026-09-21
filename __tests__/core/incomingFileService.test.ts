import { incomingFileService } from '../../src/core/intents/incomingFileService';
import { intentHandler } from '../../src/core/intents/intentHandler';

// Mock intentHandler
jest.mock('../../src/core/intents/intentHandler', () => {
  let mockListener: ((intent: any) => void) | null = null;
  return {
    intentHandler: {
      getInitialIntent: jest.fn().mockResolvedValue(null),
      onIntentReceived: jest.fn((callback) => {
        mockListener = callback;
        return () => {
          mockListener = null;
        };
      }),
      resolveUriMetadata: jest.fn().mockImplementation(async (uri: string) => {
        if (uri.endsWith('.pdf')) {
          return {
            uri,
            name: 'Resume.pdf',
            mimeType: 'application/pdf',
            size: 1024,
          };
        }
        return { uri };
      }),
      clearInitialIntent: jest.fn().mockResolvedValue(undefined),
      __emitMockIntent: (intent: any) => {
        if (mockListener) mockListener(intent);
      },
    },
  };
});

describe('IncomingFileService', () => {
  beforeEach(() => {
    incomingFileService.destroy();
    jest.clearAllMocks();
  });

  it('initializes and detects no initial document when none is present', async () => {
    const doc = await incomingFileService.initialize();
    expect(doc).toBeNull();
    expect(incomingFileService.getCurrentDocument()).toBeNull();
  });

  it('initializes and resolves initial launch intent if present', async () => {
    (intentHandler.getInitialIntent as jest.Mock).mockResolvedValueOnce({
      uri: 'file:///sdcard/Resume.pdf',
      name: 'Resume.pdf',
      mimeType: 'application/pdf',
      size: 50000,
    });

    const doc = await incomingFileService.initialize();
    expect(doc).not.toBeNull();
    expect(doc?.document.name).toBe('Resume.pdf');
    expect(doc?.fileTypeInfo.type).toBe('PDF');
    expect(doc?.isSupported).toBe(true);
  });

  it('notifies subscribers when a new document intent arrives', async () => {
    await incomingFileService.initialize();

    const mockCallback = jest.fn();
    const unsubscribe = incomingFileService.subscribe(mockCallback);

    // Simulate incoming intent
    (intentHandler as any).__emitMockIntent({
      uri: 'content://downloads/document.docx',
      name: 'document.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: 15000,
    });

    expect(mockCallback).toHaveBeenCalled();
    const resolved = mockCallback.mock.calls[0][0];
    expect(resolved.document.name).toBe('document.docx');
    expect(resolved.fileTypeInfo.type).toBe('DOCX');
    expect(resolved.isSupported).toBe(true);

    unsubscribe();
  });

  it('correctly resolves an unsupported file via resolveUri without crashing', async () => {
    const doc = await incomingFileService.resolveUri('file:///sdcard/test.xyz', 'test.xyz');
    expect(doc.isSupported).toBe(false);
    expect(doc.fileTypeInfo.type).toBe('UNSUPPORTED');
    expect(doc.document.name).toBe('test.xyz');
  });

  it('clears current document correctly', async () => {
    await incomingFileService.resolveUri('file:///sdcard/test.txt', 'test.txt');
    expect(incomingFileService.getCurrentDocument()).not.toBeNull();

    incomingFileService.clearCurrentDocument();
    expect(incomingFileService.getCurrentDocument()).toBeNull();
    expect(intentHandler.clearInitialIntent).toHaveBeenCalled();
  });
});
