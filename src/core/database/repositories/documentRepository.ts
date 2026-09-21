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
