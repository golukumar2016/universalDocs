import { DocumentItem } from '../../../shared/types';
import { DatabaseError } from '../../errors/AppError';
import { AppDatabase } from '../database';

export class FavoriteRepository {
  static async getFavoriteDocuments(): Promise<DocumentItem[]> {
    try {
      const db = await AppDatabase.getDatabase();
      const sql = 'SELECT * FROM documents WHERE isFavorite = 1 ORDER BY updatedAt DESC;';
      const [results] = await db.executeSql(sql);

      const items: DocumentItem[] = [];
      for (let i = 0; i < results.rows.length; i++) {
        items.push(this.mapRowToDocument(results.rows.item(i)));
      }
      return items;
    } catch (error) {
      throw new DatabaseError('Failed to fetch favorite documents', error);
    }
  }

  static async isFavorite(documentId: string): Promise<boolean> {
    try {
      const db = await AppDatabase.getDatabase();
      const [results] = await db.executeSql('SELECT isFavorite FROM documents WHERE id = ?;', [documentId]);
      if (results.rows.length === 0) return false;
      return Boolean(results.rows.item(0).isFavorite);
    } catch (error) {
      throw new DatabaseError(`Failed to check favorite status for ${documentId}`, error);
    }
  }

  static async setFavorite(documentId: string, isFavorite: boolean): Promise<void> {
    try {
      const db = await AppDatabase.getDatabase();
      const now = Date.now();
      await db.executeSql('UPDATE documents SET isFavorite = ?, updatedAt = ? WHERE id = ?;', [
        isFavorite ? 1 : 0,
        now,
        documentId,
      ]);
    } catch (error) {
      throw new DatabaseError(`Failed to set favorite for ${documentId}`, error);
    }
  }

  static async toggleFavorite(documentId: string): Promise<boolean> {
    try {
      const current = await this.isFavorite(documentId);
      const next = !current;
      await this.setFavorite(documentId, next);
      return next;
    } catch (error) {
      throw new DatabaseError(`Failed to toggle favorite for ${documentId}`, error);
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

export default FavoriteRepository;
