import RNFS from 'react-native-fs';
import { FileSystemError } from '../errors/AppError';
import { FILE_PATHS, FileSystem } from './fileSystem';

export class DirectoryManager {
  static async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      const exists = await FileSystem.exists(dirPath);
      if (!exists) {
        await RNFS.mkdir(dirPath);
      }
    } catch (error) {
      throw new FileSystemError(`Failed to create directory at ${dirPath}`, error);
    }
  }

  static async listContents(dirPath: string): Promise<RNFS.ReadDirItem[]> {
    try {
      const exists = await FileSystem.exists(dirPath);
      if (!exists) {
        return [];
      }
      return await RNFS.readDir(dirPath);
    } catch (error) {
      throw new FileSystemError(`Failed to list directory contents at ${dirPath}`, error);
    }
  }

  static async initAppDirectories(): Promise<void> {
    await this.ensureDirectoryExists(FILE_PATHS.APP_DOCUMENTS);
    await this.ensureDirectoryExists(FILE_PATHS.SCANS);
    await this.ensureDirectoryExists(FILE_PATHS.EXPORTS);
  }
}

export default DirectoryManager;
