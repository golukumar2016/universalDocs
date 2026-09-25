import { DocumentItem } from '../../../shared/types';
import { DatabaseError } from '../../errors/AppError';
import { AppDatabase } from '../database';

export class DocumentRepository {
  static async insert(doc: DocumentItem): Promise<void> {
    try {
      const db = await AppDatabase.getDatabase();
      const sql = `
        INSERT OR REPLACE INTO documents 
        (id, name, uri, path, size, mimeType, extension, folderId, createdAt, updatedAt, lastOpenedAt, isFavorite, isSecured)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `;
      const params = [
        doc.id,
        doc.name,
        doc.uri,
        doc.path,
        doc.size,
        doc.mimeType,
        doc.extension,
        doc.folderId || null,
        doc.createdAt,
        doc.updatedAt,
        doc.lastOpenedAt || null,
        doc.isFavorite ? 1 : 0,
        doc.isSecured ? 1 : 0,
      ];
      await db.executeSql(sql, params);
    } catch (error) {
      throw new DatabaseError(`Failed to insert document ${doc.name}`, error);
    }
  }

  static async findById(id: string): Promise<DocumentItem | null> {
    try {
      const db = await AppDatabase.getDatabase();
      const [results] = await db.executeSql('SELECT * FROM documents WHERE id = ?;', [id]);
      if (results.rows.length === 0) return null;
      return this.mapRowToDocument(results.rows.item(0));
    } catch (error) {
      throw new DatabaseError(`Failed to find document by id ${id}`, error);
    }
  }

  static async findByFolder(folderId: string | null): Promise<DocumentItem[]> {
    try {
      const db = await AppDatabase.getDatabase();
      const sql = folderId === null
        ? 'SELECT * FROM documents WHERE folderId IS NULL ORDER BY updatedAt DESC;'
        : 'SELECT * FROM documents WHERE folderId = ? ORDER BY updatedAt DESC;';
      const params = folderId === null ? [] : [folderId];
      const [results] = await db.executeSql(sql, params);

      const items: DocumentItem[] = [];
      for (let i = 0; i < results.rows.length; i++) {
        items.push(this.mapRowToDocument(results.rows.item(i)));
      }
      return items;
    } catch (error) {
      throw new DatabaseError('Failed to fetch documents by folder', error);
    }
  }

  static async searchByName(query: string): Promise<DocumentItem[]> {
    try {
      const db = await AppDatabase.getDatabase();
      const [results] = await db.executeSql(
        'SELECT * FROM documents WHERE name LIKE ? ORDER BY updatedAt DESC;',
        [`%${query}%`]
      );

      const items: DocumentItem[] = [];
      for (let i = 0; i < results.rows.length; i++) {
        items.push(this.mapRowToDocument(results.rows.item(i)));
      }
      return items;
    } catch (error) {
      throw new DatabaseError('Failed to search documents', error);
    }
  }

  static async delete(id: string): Promise<void> {
    try {
      const db = await AppDatabase.getDatabase();
      await db.executeSql('DELETE FROM documents WHERE id = ?;', [id]);
    } catch (error) {
      throw new DatabaseError(`Failed to delete document ${id}`, error);
    }
  }

  static async findByUri(uri: string): Promise<DocumentItem | null> {
    try {
      const db = await AppDatabase.getDatabase();
      const [results] = await db.executeSql('SELECT * FROM documents WHERE uri = ? LIMIT 1;', [uri]);
      if (results.rows.length === 0) return null;
      return this.mapRowToDocument(results.rows.item(0));
    } catch (error) {
      throw new DatabaseError(`Failed to find document by uri ${uri}`, error);
    }
  }

  static async getAll(): Promise<DocumentItem[]> {
    try {
      const db = await AppDatabase.getDatabase();
      const [results] = await db.executeSql('SELECT * FROM documents ORDER BY updatedAt DESC;');
      const items: DocumentItem[] = [];
      for (let i = 0; i < results.rows.length; i++) {
        items.push(this.mapRowToDocument(results.rows.item(i)));
      }
      return items;
    } catch (error) {
      throw new DatabaseError('Failed to fetch all documents', error);
    }
  }

  static async upsert(doc: Partial<DocumentItem> & { uri: string; name: string }): Promise<DocumentItem> {
    try {
      let existing: DocumentItem | null = null;
      if (doc.id) {
        existing = await this.findById(doc.id);
      }
      if (!existing && doc.uri) {
        existing = await this.findByUri(doc.uri);
      }

      const now = Date.now();
      const targetDoc: DocumentItem = existing
        ? {
            ...existing,
            name: doc.name || existing.name,
            path: doc.path || existing.path,
            size: typeof doc.size === 'number' ? doc.size : existing.size,
            mimeType: doc.mimeType || existing.mimeType,
            extension: doc.extension || existing.extension,
            updatedAt: now,
            lastOpenedAt: doc.lastOpenedAt ?? now,
          }
        : {
            id: doc.id || `doc_${now}_${Math.random().toString(36).substring(2, 8)}`,
            name: doc.name,
            uri: doc.uri,
            path: doc.path || doc.uri,
            size: typeof doc.size === 'number' ? doc.size : 0,
            mimeType: doc.mimeType || 'text/plain',
            extension: doc.extension || 'txt',
            folderId: doc.folderId ?? null,
            createdAt: doc.createdAt ?? now,
            updatedAt: now,
            lastOpenedAt: doc.lastOpenedAt ?? now,
            isFavorite: Boolean(doc.isFavorite),
            isSecured: Boolean(doc.isSecured),
          };

      await this.insert(targetDoc);
      return targetDoc;
    } catch (error) {
      throw new DatabaseError(`Failed to upsert document ${doc.name}`, error);
    }
  }

  static async updateLastOpenedAt(id: string, timestamp: number = Date.now()): Promise<void> {
    try {
      const db = await AppDatabase.getDatabase();
      await db.executeSql('UPDATE documents SET lastOpenedAt = ? WHERE id = ?;', [timestamp, id]);
    } catch (error) {
      throw new DatabaseError(`Failed to update lastOpenedAt for document ${id}`, error);
    }
  }

  static async setFavorite(id: string, isFavorite: boolean): Promise<void> {
    try {
      const db = await AppDatabase.getDatabase();
      const now = Date.now();
      await db.executeSql('UPDATE documents SET isFavorite = ?, updatedAt = ? WHERE id = ?;', [
        isFavorite ? 1 : 0,
        now,
        id,
      ]);
    } catch (error) {
      throw new DatabaseError(`Failed to set favorite for document ${id}`, error);
    }
  }

  static async toggleFavorite(id: string): Promise<boolean> {
    try {
      const doc = await this.findById(id);
      if (!doc) {
        throw new DatabaseError(`Document ${id} not found`);
      }
      const newStatus = !doc.isFavorite;
      await this.setFavorite(id, newStatus);
      return newStatus;
    } catch (error) {
      throw new DatabaseError(`Failed to toggle favorite for document ${id}`, error);
    }
  }

  private static mapRowToDocument(row: any): DocumentItem {
    return {
      id: row.id,
      name: row.name,
      uri: row.uri,
      path: row.path,
      size: row.size,
      mimeType: row.mimeType,
      extension: row.extension,
      folderId: row.folderId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      lastOpenedAt: row.lastOpenedAt,
      isFavorite: Boolean(row.isFavorite),
      isSecured: Boolean(row.isSecured),
    };
  }
}

export default DocumentRepository;
