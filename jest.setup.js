/* eslint-disable no-undef */
jest.mock('react-native-permissions', () => require('react-native-permissions/mock'));
jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/mock/document/path',
  ExternalDirectoryPath: '/mock/external/path',
  CachesDirectoryPath: '/mock/caches/path',
  mkdir: jest.fn().mockResolvedValue(true),
  exists: jest.fn().mockResolvedValue(true),
  readFile: jest.fn().mockResolvedValue(''),
  writeFile: jest.fn().mockResolvedValue(true),
  unlink: jest.fn().mockResolvedValue(true),
  copyFile: jest.fn().mockResolvedValue(true),
  moveFile: jest.fn().mockResolvedValue(true),
  stat: jest.fn().mockResolvedValue({ size: 100, mtime: Date.now() }),
}));

jest.mock('@react-native-documents/picker', () => ({
  pick: jest.fn(),
  types: { allFiles: '*/*' },
}));

// In-memory mock database store for tests
const mockTables = {
  documents: new Map(),
  folders: new Map(),
  recent: new Map(),
};

const mockExecuteSql = jest.fn(async (sql, params = []) => {
  const trimmed = sql.trim();

  // DDL queries: CREATE TABLE / CREATE INDEX -> success
  if (/^CREATE/i.test(trimmed)) {
    return [{ rows: { length: 0, item: () => null }, rowsAffected: 0 }];
  }

  // INSERT OR REPLACE INTO documents
  if (/^INSERT/i.test(trimmed) && /documents/i.test(trimmed)) {
    const doc = {
      id: params[0],
      name: params[1],
      uri: params[2],
      path: params[3],
      size: params[4],
      mimeType: params[5],
      extension: params[6],
      folderId: params[7],
      createdAt: params[8],
      updatedAt: params[9],
      lastOpenedAt: params[10],
      isFavorite: params[11],
      isSecured: params[12],
    };
    mockTables.documents.set(doc.id, doc);
    return [{ rows: { length: 0, item: () => null }, rowsAffected: 1, insertId: doc.id }];
  }

  // INSERT OR REPLACE INTO recent
  if (/^INSERT/i.test(trimmed) && /recent/i.test(trimmed)) {
    const rec = {
      id: params[0],
      documentId: params[1],
      openedAt: params[2],
    };
    mockTables.recent.set(rec.id, rec);
    return [{ rows: { length: 0, item: () => null }, rowsAffected: 1 }];
  }

  // INSERT OR REPLACE INTO folders
  if (/^INSERT/i.test(trimmed) && /folders/i.test(trimmed)) {
    const folder = {
      id: params[0],
      name: params[1],
      path: params[2],
      parentId: params[3],
      createdAt: params[4],
      updatedAt: params[5],
    };
    mockTables.folders.set(folder.id, folder);
    return [{ rows: { length: 0, item: () => null }, rowsAffected: 1 }];
  }

  // UPDATE documents SET ...
  if (/^UPDATE documents/i.test(trimmed)) {
    if (/lastOpenedAt\s*=\s*\?/i.test(trimmed) && /WHERE id\s*=\s*\?/i.test(trimmed)) {
      const [time, id] = params;
      const doc = mockTables.documents.get(id);
      if (doc) {
        doc.lastOpenedAt = time;
        mockTables.documents.set(id, doc);
      }
    } else if (/lastOpenedAt\s*=\s*NULL/i.test(trimmed) && /WHERE id\s*=\s*\?/i.test(trimmed)) {
      const [id] = params;
      const doc = mockTables.documents.get(id);
      if (doc) {
        doc.lastOpenedAt = null;
        mockTables.documents.set(id, doc);
      }
    } else if (/lastOpenedAt\s*=\s*NULL/i.test(trimmed)) {
      for (const [id, doc] of mockTables.documents.entries()) {
        doc.lastOpenedAt = null;
        mockTables.documents.set(id, doc);
      }
    } else if (/isFavorite\s*=\s*\?/i.test(trimmed)) {
      const [fav, updatedAt, id] = params.length === 3 ? params : [params[0], Date.now(), params[1]];
      const doc = mockTables.documents.get(id);
      if (doc) {
        doc.isFavorite = fav;
        doc.updatedAt = updatedAt;
        mockTables.documents.set(id, doc);
      }
    }
    return [{ rows: { length: 0, item: () => null }, rowsAffected: 1 }];
  }

  // SELECT * FROM documents WHERE id = ?
  if (/SELECT \* FROM documents WHERE id = \?/i.test(trimmed)) {
    const id = params[0];
    const doc = mockTables.documents.get(id);
    const rows = doc ? [doc] : [];
    return [{ rows: { length: rows.length, item: (i) => rows[i] } }];
  }

  // SELECT * FROM documents WHERE uri = ?
  if (/SELECT \* FROM documents WHERE uri = \?/i.test(trimmed)) {
    const uri = params[0];
    const rows = Array.from(mockTables.documents.values()).filter((d) => d.uri === uri);
    return [{ rows: { length: rows.length, item: (i) => rows[i] } }];
  }

  // SELECT * FROM documents WHERE isFavorite = 1
  if (/SELECT \* FROM documents WHERE isFavorite = 1/i.test(trimmed)) {
    const rows = Array.from(mockTables.documents.values())
      .filter((d) => Boolean(d.isFavorite))
      .sort((a, b) => b.updatedAt - a.updatedAt);
    return [{ rows: { length: rows.length, item: (i) => rows[i] } }];
  }

  // SELECT isFavorite FROM documents WHERE id = ?
  if (/SELECT isFavorite FROM documents WHERE id = \?/i.test(trimmed)) {
    const id = params[0];
    const doc = mockTables.documents.get(id);
    const rows = doc ? [{ isFavorite: doc.isFavorite }] : [];
    return [{ rows: { length: rows.length, item: (i) => rows[i] } }];
  }

  // SELECT * FROM documents WHERE folderId IS NULL ...
  if (/SELECT \* FROM documents WHERE folderId IS NULL/i.test(trimmed)) {
    const rows = Array.from(mockTables.documents.values())
      .filter((d) => !d.folderId)
      .sort((a, b) => b.updatedAt - a.updatedAt);
    return [{ rows: { length: rows.length, item: (i) => rows[i] } }];
  }

  // SELECT * FROM documents WHERE folderId = ?
  if (/SELECT \* FROM documents WHERE folderId = \?/i.test(trimmed)) {
    const folderId = params[0];
    const rows = Array.from(mockTables.documents.values())
      .filter((d) => d.folderId === folderId)
      .sort((a, b) => b.updatedAt - a.updatedAt);
    return [{ rows: { length: rows.length, item: (i) => rows[i] } }];
  }

  // SELECT * FROM documents WHERE name LIKE ?
  if (/SELECT \* FROM documents WHERE name LIKE \?/i.test(trimmed)) {
    const q = (params[0] || '').replace(/%/g, '').toLowerCase();
    const rows = Array.from(mockTables.documents.values())
      .filter((d) => d.name.toLowerCase().includes(q))
      .sort((a, b) => b.updatedAt - a.updatedAt);
    return [{ rows: { length: rows.length, item: (i) => rows[i] } }];
  }

  // SELECT d.* FROM documents d INNER JOIN recent r ON d.id = r.documentId ORDER BY r.openedAt DESC
  if (/INNER JOIN recent/i.test(trimmed)) {
    const limit = params[0] || 20;
    const recents = Array.from(mockTables.recent.values()).sort((a, b) => b.openedAt - a.openedAt);
    const rows = [];
    for (const r of recents) {
      const doc = mockTables.documents.get(r.documentId);
      if (doc && !rows.some((x) => x.id === doc.id)) {
        rows.push(doc);
      }
      if (rows.length >= limit) break;
    }
    return [{ rows: { length: rows.length, item: (i) => rows[i] } }];
  }

  // SELECT * FROM documents WHERE lastOpenedAt IS NOT NULL ...
  if (/SELECT \* FROM documents WHERE lastOpenedAt IS NOT NULL/i.test(trimmed)) {
    const limit = params[0] || 20;
    const rows = Array.from(mockTables.documents.values())
      .filter((d) => d.lastOpenedAt != null && d.lastOpenedAt > 0)
      .sort((a, b) => (b.lastOpenedAt || 0) - (a.lastOpenedAt || 0))
      .slice(0, limit);
    return [{ rows: { length: rows.length, item: (i) => rows[i] } }];
  }

  // SELECT * FROM documents (fallback / all)
  if (/SELECT \* FROM documents/i.test(trimmed)) {
    const rows = Array.from(mockTables.documents.values()).sort((a, b) => b.updatedAt - a.updatedAt);
    return [{ rows: { length: rows.length, item: (i) => rows[i] } }];
  }

  // DELETE FROM documents WHERE id = ?
  if (/DELETE FROM documents WHERE id = \?/i.test(trimmed)) {
    mockTables.documents.delete(params[0]);
    return [{ rows: { length: 0, item: () => null }, rowsAffected: 1 }];
  }

  // DELETE FROM recent WHERE documentId = ?
  if (/DELETE FROM recent WHERE documentId = \?/i.test(trimmed)) {
    for (const [k, v] of mockTables.recent.entries()) {
      if (v.documentId === params[0]) mockTables.recent.delete(k);
    }
    return [{ rows: { length: 0, item: () => null }, rowsAffected: 1 }];
  }

  // DELETE FROM recent
  if (/DELETE FROM recent/i.test(trimmed)) {
    mockTables.recent.clear();
    return [{ rows: { length: 0, item: () => null }, rowsAffected: 1 }];
  }

  return [{ rows: { length: 0, item: () => null }, rowsAffected: 0 }];
});

const mockDbInstance = {
  transaction: jest.fn((cb) => cb({ executeSql: mockExecuteSql })),
  executeSql: mockExecuteSql,
  close: jest.fn().mockResolvedValue(true),
  _mockTables: mockTables,
};

jest.mock('react-native-sqlite-storage', () => ({
  enablePromise: jest.fn(),
  openDatabase: jest.fn().mockResolvedValue(mockDbInstance),
}));

jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn(),
  getGenericPassword: jest.fn(),
  resetGenericPassword: jest.fn(),
}));

jest.mock('react-native-biometrics', () => {
  return jest.fn().mockImplementation(() => ({
    isSensorAvailable: jest.fn().mockResolvedValue({ available: false }),
    simplePrompt: jest.fn().mockResolvedValue({ success: false }),
  }));
});

const { NativeModules } = require('react-native');
NativeModules.AndroidNavigationBarModule = {
  setNavigationBarTheme: jest.fn().mockResolvedValue(true),
  setSystemBarsTheme: jest.fn().mockResolvedValue(true),
};

NativeModules.IncomingFileModule = {
  getInitialFile: jest.fn().mockResolvedValue(null),
  clearInitialFile: jest.fn().mockResolvedValue(true),
  resolveUri: jest.fn(),
  takePersistableUriPermission: jest.fn().mockResolvedValue(true),
  hasAllFilesAccess: jest.fn().mockResolvedValue(true),
  requestAllFilesAccess: jest.fn().mockResolvedValue(true),
  listFiles: jest.fn().mockResolvedValue([]),
  listDocumentTree: jest.fn().mockResolvedValue([]),
  getDefaultDirectories: jest.fn().mockResolvedValue({
    download: '/mock/download',
    documents: '/mock/documents',
    externalStorage: '/mock/storage',
    appInternal: '/mock/internal',
    appExternal: '/mock/external',
  }),
  addListener: jest.fn(),
  removeListeners: jest.fn(),
};

NativeModules.PdfRendererModule = {
  openPdf: jest.fn().mockResolvedValue({
    docId: 'mock_doc_id',
    pageCount: 3,
    pages: [
      { pageIndex: 0, width: 595, height: 842, aspectRatio: 595 / 842 },
      { pageIndex: 1, width: 595, height: 842, aspectRatio: 595 / 842 },
      { pageIndex: 2, width: 595, height: 842, aspectRatio: 595 / 842 },
    ],
  }),
  renderPage: jest.fn().mockImplementation((docId, pageIndex) => {
    return Promise.resolve({
      pageIndex,
      imagePath: `/mock/cache/${docId}/page_${pageIndex}.png`,
      width: 595,
      height: 842,
    });
  }),
  closePdf: jest.fn().mockResolvedValue(true),
  clearAllPdfCache: jest.fn().mockResolvedValue(true),
};

NativeModules.DocumentScannerModule = {
  detectDocumentEdges: jest.fn().mockImplementation((imageUri) => {
    return Promise.resolve({
      width: 1200,
      height: 1600,
      filePath: imageUri,
      corners: {
        topLeft: { x: 72, y: 96 },
        topRight: { x: 1128, y: 96 },
        bottomRight: { x: 1128, y: 1504 },
        bottomLeft: { x: 72, y: 1504 },
      },
    });
  }),
  cropAndPerspectiveTransform: jest.fn().mockImplementation((imageUri, corners) => {
    return Promise.resolve({
      imagePath: '/mock/cache/scanner_temp/cropped_123.jpg',
      width: 1056,
      height: 1408,
    });
  }),
  enhanceImage: jest.fn().mockImplementation((imageUri, mode) => {
    return Promise.resolve(`/mock/cache/scanner_temp/enhanced_${mode}_123.jpg`);
  }),
  rotateImage: jest.fn().mockImplementation((imageUri, degrees) => {
    return Promise.resolve(`/mock/cache/scanner_temp/rotated_123.jpg`);
  }),
  generatePdfFromImages: jest.fn().mockImplementation((imagePaths, fileName) => {
    return Promise.resolve({
      path: `/mock/storage/UniversalDocs/${fileName || 'Scanned_Doc.pdf'}`,
      uri: `file:///mock/storage/UniversalDocs/${fileName || 'Scanned_Doc.pdf'}`,
      fileName: fileName || 'Scanned_Doc.pdf',
      pageCount: imagePaths.length,
      size: 1024 * 1024 * 1.5,
    });
  }),
  cleanupTemporaryImages: jest.fn().mockResolvedValue(true),
};

jest.mock('react-native-vision-camera', () => {
  const React = require('react');
  const { View } = require('react-native');
  const mockPhotoOutput = {
    capturePhoto: jest.fn().mockResolvedValue({
      width: 1200,
      height: 1600,
      saveToTemporaryFileAsync: jest.fn().mockResolvedValue('/mock/camera/photo_123.jpg'),
      dispose: jest.fn(),
    }),
  };
  return {
    Camera: React.forwardRef((props, ref) => {
      React.useImperativeHandle(ref, () => ({
        takePhoto: jest.fn().mockResolvedValue({
          path: '/mock/camera/photo_123.jpg',
          width: 1200,
          height: 1600,
        }),
      }));
      return React.createElement(View, props);
    }),
    useCameraDevice: jest.fn().mockReturnValue({ id: 'back_camera', position: 'back' }),
    usePhotoOutput: jest.fn().mockReturnValue(mockPhotoOutput),
    useCameraPermission: jest.fn().mockReturnValue({ hasPermission: true, requestPermission: jest.fn() }),
  };
});

NativeModules.PdfAnnotationModule = {
  generateAnnotatedPdf: jest.fn().mockImplementation((originalPath, annotationsJson, newFileName) => {
    const finalName = newFileName || 'Document_annotated.pdf';
    return Promise.resolve({
      filePath: `/mock/storage/UniversalDocs/${finalName}`,
      uri: `file:///mock/storage/UniversalDocs/${finalName}`,
      fileName: finalName,
      pageCount: 3,
      size: 1024 * 500,
      annotationsSidecar: `/mock/storage/UniversalDocs/.annotations/mock_annot.json`,
    });
  }),
  saveAnnotationMetadata: jest.fn().mockResolvedValue(true),
  loadAnnotationMetadata: jest.fn().mockResolvedValue('[]'),
};



