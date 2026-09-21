import { FolderItem } from '../../../shared/types';
import { DatabaseError } from '../../errors/AppError';
import { AppDatabase } from '../database';

export class FolderRepository {
  static async insert(folder: FolderItem): Promise<void> {
    try {
      const db = await AppDatabase.getDatabase();
      const sql = `
        INSERT OR REPLACE INTO folders 
        (id, name, path, parentId, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?);
      `;
      const params = [
        folder.id,
        folder.name,
        folder.path,
        folder.parentId || null,
        folder.createdAt,
        folder.updatedAt,
      ];
      await db.executeSql(sql, params);
    } catch (error) {
      throw new DatabaseError(`Failed to insert folder ${folder.name}`, error);
    }
  }

  static async findById(id: string): Promise<FolderItem | null> {
    try {
      const db = await AppDatabase.getDatabase();
      const [results] = await db.executeSql('SELECT * FROM folders WHERE id = ?;', [id]);
      if (results.rows.length === 0) return null;
      return this.mapRowToFolder(results.rows.item(0));
    } catch (error) {
      throw new DatabaseError(`Failed to find folder by id ${id}`, error);
    }
  }

  static async findByParent(parentId: string | null): Promise<FolderItem[]> {
    try {
      const db = await AppDatabase.getDatabase();
      const sql = parentId === null
        ? 'SELECT * FROM folders WHERE parentId IS NULL ORDER BY name ASC;'
        : 'SELECT * FROM folders WHERE parentId = ? ORDER BY name ASC;';
      const params = parentId === null ? [] : [parentId];
      const [results] = await db.executeSql(sql, params);

      const items: FolderItem[] = [];
      for (let i = 0; i < results.rows.length; i++) {
        items.push(this.mapRowToFolder(results.rows.item(i)));
      }
      return items;
    } catch (error) {
      throw new DatabaseError('Failed to fetch folders', error);
    }
  }

  static async delete(id: string): Promise<void> {
    try {
      const db = await AppDatabase.getDatabase();
      await db.executeSql('DELETE FROM folders WHERE id = ?;', [id]);
    } catch (error) {
      throw new DatabaseError(`Failed to delete folder ${id}`, error);
    }
  }

  private static mapRowToFolder(row: any): FolderItem {
    return {
      id: row.id,
      name: row.name,
      path: row.path,
      parentId: row.parentId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

export default FolderRepository;
