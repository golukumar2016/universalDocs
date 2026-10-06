import SQLite, { SQLiteDatabase } from 'react-native-sqlite-storage';
import { DatabaseError } from '../errors/AppError';
import {
  CREATE_DOCUMENTS_TABLE,
  CREATE_FOLDERS_TABLE,
  CREATE_RECENT_TABLE,
  CREATE_VAULT_DOCUMENTS_TABLE,
  CREATE_INDEXES,
} from './schema';

SQLite.enablePromise(true);

const DATABASE_NAME = 'UniversalDocs.db';

export class AppDatabase {
  private static instance: SQLiteDatabase | null = null;

  static async getDatabase(): Promise<SQLiteDatabase> {
    if (this.instance) {
      return this.instance;
    }

    try {
      this.instance = await SQLite.openDatabase({
        name: DATABASE_NAME,
        location: 'default',
      });
      await this.initSchema(this.instance);
      return this.instance;
    } catch (error) {
      throw new DatabaseError('Failed to open database connection', error);
    }
  }

  private static async initSchema(db: SQLiteDatabase): Promise<void> {
    try {
      await db.executeSql(CREATE_FOLDERS_TABLE);
      await db.executeSql(CREATE_DOCUMENTS_TABLE);
      await db.executeSql(CREATE_RECENT_TABLE);
      await db.executeSql(CREATE_VAULT_DOCUMENTS_TABLE);

      for (const indexSql of CREATE_INDEXES) {
        await db.executeSql(indexSql);
      }
    } catch (error) {
      throw new DatabaseError('Failed to initialize database schema', error);
    }
  }

  static async closeDatabase(): Promise<void> {
    if (this.instance) {
      await this.instance.close();
      this.instance = null;
    }
  }
}

export default AppDatabase;
