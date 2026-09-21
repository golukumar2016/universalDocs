import RNFS from 'react-native-fs';
import { FileSystemError } from '../errors/AppError';
import { FileSystem } from './fileSystem';

export class FileReader {
  static async readText(path: string, encoding: 'utf8' | 'ascii' = 'utf8'): Promise<string> {
    const exists = await FileSystem.exists(path);
    if (!exists) {
      throw new FileSystemError(`File not found at ${path}`);
    }

    try {
      return await RNFS.readFile(path, encoding);
    } catch (error) {
      throw new FileSystemError(`Failed to read text from ${path}`, error);
    }
  }

  static async readBase64(path: string): Promise<string> {
    const exists = await FileSystem.exists(path);
    if (!exists) {
      throw new FileSystemError(`File not found at ${path}`);
    }

    try {
      return await RNFS.readFile(path, 'base64');
    } catch (error) {
      throw new FileSystemError(`Failed to read base64 from ${path}`, error);
    }
  }

  static async readChunk(
    path: string,
    length: number,
    position: number,
    encodingOrHashType: string = 'base64'
  ): Promise<string> {
    try {
      return await RNFS.read(path, length, position, encodingOrHashType);
    } catch (error) {
      throw new FileSystemError(`Failed to read chunk from ${path}`, error);
    }
  }
}

export default FileReader;
