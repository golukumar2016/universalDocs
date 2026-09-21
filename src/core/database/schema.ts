export const CREATE_DOCUMENTS_TABLE = `
  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    uri TEXT NOT NULL,
    path TEXT NOT NULL,
    size INTEGER NOT NULL DEFAULT 0,
    mimeType TEXT NOT NULL,
    extension TEXT NOT NULL,
    folderId TEXT,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL,
    lastOpenedAt INTEGER,
    isFavorite INTEGER NOT NULL DEFAULT 0,
    isSecured INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (folderId) REFERENCES folders (id) ON DELETE SET NULL
  );
`;

export const CREATE_FOLDERS_TABLE = `
  CREATE TABLE IF NOT EXISTS folders (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    parentId TEXT,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL,
    FOREIGN KEY (parentId) REFERENCES folders (id) ON DELETE CASCADE
  );
`;

export const CREATE_RECENT_TABLE = `
  CREATE TABLE IF NOT EXISTS recent (
    id TEXT PRIMARY KEY NOT NULL,
    documentId TEXT NOT NULL,
    openedAt INTEGER NOT NULL,
    FOREIGN KEY (documentId) REFERENCES documents (id) ON DELETE CASCADE
  );
`;

export const CREATE_INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_documents_folder ON documents (folderId);`,
  `CREATE INDEX IF NOT EXISTS idx_documents_updated ON documents (updatedAt DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_recent_opened ON recent (openedAt DESC);`,
];
