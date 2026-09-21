import { DocumentItem, RecentItem } from '../../../shared/types';
import { DatabaseError } from '../../errors/AppError';
import { AppDatabase } from '../database';

export class RecentRepository {
  static async addRecent(documentId: string): Promise<void> {
    try {
      const db = await AppDatabase.getDatabase();
      const id = `recent_${documentId}`;
      const now = Date.now();

      await db.executeSql(
        'INSERT OR REPLACE INTO recent (id, documentId, openedAt) VALUES (?, ?, ?);',
        [id, documentId, now]
      );

      // Also update lastOpenedAt in documents table
      await db.executeSql('UPDATE documents SET lastOpenedAt = ? WHERE id = ?;', [
        now,
        documentId,
      ]);
    } catch (error) {
      throw new DatabaseError(`Failed to add recent item for document ${documentId}`, error);
    }
  }

  static async getRecentDocuments(limit: number = 20): Promise<DocumentItem[]> {
    try {
      const db = await AppDatabase.getDatabase();
      const sql = `
        SELECT d.* FROM documents d
        INNER JOIN recent r ON d.id = r.documentId
        ORDER BY r.openedAt DESC
        LIMIT ?;
      `;
      const [results] = await db.executeSql(sql, [limit]);

      const items: DocumentItem[] = [];
      for (let i = 0; i < results.rows.length; i++) {
        const row = results.rows.item(i);
        items.push({
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
        });
      }
      return items;
    } catch (error) {
      throw new DatabaseError('Failed to fetch recent documents', error);
    }
  }

  static async clearRecent(): Promise<void> {
    try {
      const db = await AppDatabase.getDatabase();
      await db.executeSql('DELETE FROM recent;');
    } catch (error) {
      throw new DatabaseError('Failed to clear recent list', error);
    }
  }
}

export default RecentRepository;
