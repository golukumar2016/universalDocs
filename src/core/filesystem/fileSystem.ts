import RNFS from 'react-native-fs';
import { FileSystemError } from '../errors/AppError';

export const FILE_PATHS = {
  DOCUMENTS: RNFS.DocumentDirectoryPath,
  CACHES: RNFS.CachesDirectoryPath,
  APP_DOCUMENTS: `${RNFS.DocumentDirectoryPath}/UniversalDocs`,
  SCANS: `${RNFS.DocumentDirectoryPath}/UniversalDocs/Scans`,
  EXPORTS: `${RNFS.DocumentDirectoryPath}/UniversalDocs/Exports`,
};

export class FileSystem {
  static async exists(path: string): Promise<boolean> {
    try {
      return await RNFS.exists(path);
    } catch (error) {
      throw new FileSystemError(`Error checking file existence at ${path}`, error);
    }
  }

  static async stat(path: string): Promise<RNFS.StatResult> {
    try {
      return await RNFS.stat(path);
    } catch (error) {
      throw new FileSystemError(`Error getting file stats at ${path}`, error);
    }
  }

  static async unlink(path: string): Promise<void> {
    try {
      const exists = await RNFS.exists(path);
      if (exists) {
        await RNFS.unlink(path);
      }
    } catch (error) {
      throw new FileSystemError(`Error deleting file at ${path}`, error);
    }
  }

  static async copy(fromPath: string, toPath: string): Promise<void> {
    try {
      await RNFS.copyFile(fromPath, toPath);
    } catch (error) {
      throw new FileSystemError(`Error copying file from ${fromPath} to ${toPath}`, error);
    }
  }

  static async move(fromPath: string, toPath: string): Promise<void> {
    try {
      await RNFS.moveFile(fromPath, toPath);
    } catch (error) {
      throw new FileSystemError(`Error moving file from ${fromPath} to ${toPath}`, error);
    }
  }
}

export default FileSystem;
