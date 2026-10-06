import { VaultDocumentItem } from '../../../features/security/vault.types';
import { DatabaseError } from '../../errors/AppError';
import { AppDatabase } from '../database';

export class VaultRepository {
  static async insert(doc: VaultDocumentItem): Promise<void> {
    try {
      const db = await AppDatabase.getDatabase();
      const sql = `
        INSERT OR REPLACE INTO vault_documents
        (id, name, encryptedPath, mimeType, extension, originalSize, encryptedSize, createdAt, updatedAt, lastOpenedAt, isFavorite)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `;
      const params = [
        doc.id,
        doc.name,
        doc.encryptedPath,
        doc.mimeType,
        doc.extension,
        doc.originalSize,
        doc.encryptedSize,
        doc.createdAt,
        doc.updatedAt,
        doc.lastOpenedAt ?? null,
        doc.isFavorite ? 1 : 0,
      ];
      await db.executeSql(sql, params);
    } catch (error) {
      throw new DatabaseError(`Failed to insert vault document ${doc.name}`, error);
    }
  }

  static async findById(id: string): Promise<VaultDocumentItem | null> {
    try {
      const db = await AppDatabase.getDatabase();
      const [results] = await db.executeSql('SELECT * FROM vault_documents WHERE id = ?;', [id]);
      if (results.rows.length === 0) return null;
      return this.mapRowToVaultDocument(results.rows.item(0));
    } catch (error) {
      throw new DatabaseError(`Failed to find vault document by id ${id}`, error);
    }
  }

  static async getAll(): Promise<VaultDocumentItem[]> {
    try {
      const db = await AppDatabase.getDatabase();
      const [results] = await db.executeSql(
        'SELECT * FROM vault_documents ORDER BY updatedAt DESC;'
      );
      const items: VaultDocumentItem[] = [];
      for (let i = 0; i < results.rows.length; i++) {
        items.push(this.mapRowToVaultDocument(results.rows.item(i)));
      }
      return items;
    } catch (error) {
      throw new DatabaseError('Failed to fetch vault documents', error);
    }
  }

  static async search(query: string): Promise<VaultDocumentItem[]> {
    try {
      const db = await AppDatabase.getDatabase();
      const [results] = await db.executeSql(
        'SELECT * FROM vault_documents WHERE name LIKE ? ORDER BY updatedAt DESC;',
        [`%${query}%`]
      );
      const items: VaultDocumentItem[] = [];
      for (let i = 0; i < results.rows.length; i++) {
        items.push(this.mapRowToVaultDocument(results.rows.item(i)));
      }
      return items;
    } catch (error) {
      throw new DatabaseError(`Failed to search vault documents with query: ${query}`, error);
    }
  }

  static async delete(id: string): Promise<void> {
    try {
      const db = await AppDatabase.getDatabase();
      await db.executeSql('DELETE FROM vault_documents WHERE id = ?;', [id]);
    } catch (error) {
      throw new DatabaseError(`Failed to delete vault document ${id}`, error);
    }
  }

  static async updateLastOpenedAt(id: string, timestamp: number = Date.now()): Promise<void> {
    try {
      const db = await AppDatabase.getDatabase();
      await db.executeSql('UPDATE vault_documents SET lastOpenedAt = ? WHERE id = ?;', [
        timestamp,
        id,
      ]);
    } catch (error) {
      throw new DatabaseError(`Failed to update lastOpenedAt for vault document ${id}`, error);
    }
  }

  static async setFavorite(id: string, isFavorite: boolean): Promise<void> {
    try {
      const db = await AppDatabase.getDatabase();
      const now = Date.now();
      await db.executeSql(
        'UPDATE vault_documents SET isFavorite = ?, updatedAt = ? WHERE id = ?;',
        [isFavorite ? 1 : 0, now, id]
      );
    } catch (error) {
      throw new DatabaseError(`Failed to set favorite for vault document ${id}`, error);
    }
  }

  static async toggleFavorite(id: string): Promise<boolean> {
    try {
      const doc = await this.findById(id);
      if (!doc) {
        throw new DatabaseError(`Vault document ${id} not found`);
      }
      const newStatus = !doc.isFavorite;
      await this.setFavorite(id, newStatus);
      return newStatus;
    } catch (error) {
      throw new DatabaseError(`Failed to toggle favorite for vault document ${id}`, error);
    }
  }

  private static mapRowToVaultDocument(row: any): VaultDocumentItem {
    return {
      id: row.id,
      name: row.name,
      encryptedPath: row.encryptedPath,
      mimeType: row.mimeType,
      extension: row.extension,
      originalSize: Number(row.originalSize || 0),
      encryptedSize: Number(row.encryptedSize || 0),
      createdAt: Number(row.createdAt),
      updatedAt: Number(row.updatedAt),
      lastOpenedAt: row.lastOpenedAt ? Number(row.lastOpenedAt) : null,
      isFavorite: Boolean(row.isFavorite),
    };
  }
}

export default VaultRepository;
