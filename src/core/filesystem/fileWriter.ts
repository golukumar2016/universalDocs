import RNFS from 'react-native-fs';
import { FileSystemError } from '../errors/AppError';

export class FileWriter {
  static async writeText(
    path: string,
    contents: string,
    encoding: 'utf8' | 'ascii' = 'utf8'
  ): Promise<void> {
    try {
      await RNFS.writeFile(path, contents, encoding);
    } catch (error) {
      throw new FileSystemError(`Failed to write text to ${path}`, error);
    }
  }

  static async writeBase64(path: string, base64Data: string): Promise<void> {
    try {
      await RNFS.writeFile(path, base64Data, 'base64');
    } catch (error) {
      throw new FileSystemError(`Failed to write base64 to ${path}`, error);
    }
  }

  static async appendFile(
    path: string,
    contents: string,
    encoding: 'utf8' | 'ascii' = 'utf8'
  ): Promise<void> {
    try {
      await RNFS.appendFile(path, contents, encoding);
    } catch (error) {
      throw new FileSystemError(`Failed to append file at ${path}`, error);
    }
  }
}

export default FileWriter;
