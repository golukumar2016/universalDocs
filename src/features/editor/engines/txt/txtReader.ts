import RNFS from 'react-native-fs';
import { FileSystemError } from '../../../../core/errors/AppError';
import { TxtEncoding } from './txt.types';

export class TxtReader {
  private static readonly MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB limit for memory safety

  /**
   * Reads plain text from a filesystem path, file:// URI, or Android SAF content:// URI.
   */
  static async readTextFile(
    uriOrPath: string,
    encoding: TxtEncoding = 'utf8'
  ): Promise<string> {
    if (!uriOrPath || typeof uriOrPath !== 'string') {
      throw new FileSystemError('Invalid file URI or path provided.');
    }

    const isContentUri = uriOrPath.startsWith('content://');
    const cleanPath = uriOrPath.startsWith('file://')
      ? uriOrPath.replace('file://', '')
      : uriOrPath;

    // For filesystem files, verify existence and size
    if (!isContentUri) {
      let exists = false;
      try {
        exists = await RNFS.exists(cleanPath);
      } catch (err: any) {
        const msg = err?.message?.toLowerCase() || '';
        if (msg.includes('permission') || msg.includes('eacces') || msg.includes('security')) {
          throw new FileSystemError(
            'UniversalDocs no longer has access to this document. Please select the file again.',
            err
          );
        }
      }

      if (!exists) {
        throw new FileSystemError('This document is no longer available.');
      }

      try {
        const stat = await RNFS.stat(cleanPath);
        if (stat.size > this.MAX_FILE_SIZE) {
          throw new FileSystemError(
            `File size (${Math.round(stat.size / 1024 / 1024)}MB) exceeds maximum editable limit for text documents.`
          );
        }
      } catch (statErr: any) {
        if (statErr instanceof FileSystemError || statErr?.name === 'FileSystemError') {
          throw statErr;
        }
      }
    }

    // Read file contents (works for both content:// and filesystem paths via ContentResolver)
    try {
      const target = isContentUri ? uriOrPath : cleanPath;
      return await RNFS.readFile(target, encoding);
    } catch (primaryErr: any) {
      const msg = primaryErr?.message?.toLowerCase() || '';

      if (msg.includes('enoent') || msg.includes('not found') || msg.includes('no such file')) {
        throw new FileSystemError('This document is no longer available.', primaryErr);
      }
      if (
        msg.includes('permission') ||
        msg.includes('eacces') ||
        msg.includes('security') ||
        msg.includes('denied')
      ) {
        throw new FileSystemError(
          'UniversalDocs no longer has access to this document. Please select the file again.',
          primaryErr
        );
      }

      // Try ascii fallback ONLY if it could be a charset/decoding issue
      if (encoding === 'utf8') {
        try {
          const target = isContentUri ? uriOrPath : cleanPath;
          return await RNFS.readFile(target, 'ascii');
        } catch {}
      }

      throw new FileSystemError('Unable to read this document.', primaryErr);
    }
  }
}

export default TxtReader;
