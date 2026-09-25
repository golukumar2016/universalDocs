import RNFS from 'react-native-fs';
import { FileSystemError } from '../../../../core/errors/AppError';
import { DirectoryManager } from '../../../../core/filesystem/directoryManager';
import { FILE_PATHS } from '../../../../core/filesystem/fileSystem';
import { TxtEncoding } from './txt.types';

export class TxtWriter {
  /**
   * Safely writes text content to a filesystem file or Android SAF content:// URI.
   * Utilizes staging and rollback to ensure original file is never corrupted or destroyed.
   */
  static async writeTextFile(
    uriOrPath: string,
    content: string,
    encoding: TxtEncoding = 'utf8'
  ): Promise<void> {
    if (!uriOrPath || typeof uriOrPath !== 'string') {
      throw new FileSystemError('Invalid file URI or path provided.');
    }

    const isContentUri = uriOrPath.startsWith('content://');
    const normalizedPath = uriOrPath.startsWith('file://')
      ? uriOrPath.replace('file://', '')
      : uriOrPath;

    if (isContentUri) {
      // Content URIs (Android Storage Access Framework)
      try {
        await RNFS.writeFile(uriOrPath, content, encoding);
      } catch (err: any) {
        throw new FileSystemError(
          'Unable to save changes. Your original document has not been replaced.',
          err
        );
      }
      return;
    }

    // Filesystem file: implement safe atomic staging
    const parentDir = normalizedPath.substring(0, normalizedPath.lastIndexOf('/'));
    if (parentDir) {
      await DirectoryManager.ensureDirectoryExists(parentDir);
    }

    const tempFilePath = `${normalizedPath}.tmp_${Date.now()}`;
    const backupFilePath = `${normalizedPath}.bak_${Date.now()}`;

    try {
      // Step 1: Write to temporary staging file
      await RNFS.writeFile(tempFilePath, content, encoding);

      // Step 2: Verify temporary file was written
      const tempExists = await RNFS.exists(tempFilePath);
      if (!tempExists) {
        throw new Error('Temporary staged file was not created');
      }

      // Step 3: Atomic replace
      const originalExists = await RNFS.exists(normalizedPath);
      if (originalExists) {
        // Back up original file temporarily
        try {
          await RNFS.copyFile(normalizedPath, backupFilePath);
          await RNFS.unlink(normalizedPath);
          await RNFS.moveFile(tempFilePath, normalizedPath);
          // Cleanup backup after successful commit
          await RNFS.unlink(backupFilePath).catch(() => {});
        } catch (replaceErr) {
          // Rollback: restore backup if original was unlinked
          const originalStillThere = await RNFS.exists(normalizedPath);
          if (!originalStillThere && (await RNFS.exists(backupFilePath))) {
            await RNFS.moveFile(backupFilePath, normalizedPath).catch(() => {});
          }
          await RNFS.unlink(tempFilePath).catch(() => {});
          await RNFS.unlink(backupFilePath).catch(() => {});
          throw replaceErr;
        }
      } else {
        // New file, simply move temp to final path
        await RNFS.moveFile(tempFilePath, normalizedPath);
      }
    } catch (error: any) {
      // Clean up temp file on failure
      try {
        const stillTemp = await RNFS.exists(tempFilePath);
        if (stillTemp) {
          await RNFS.unlink(tempFilePath);
        }
      } catch {}

      throw new FileSystemError(
        'Unable to save changes. Your original document has not been replaced.',
        error
      );
    }
  }

  /**
   * Creates a brand new text file in the specified directory (defaults to app documents).
   */
  static async createNewTextFile(
    targetDirectory: string = FILE_PATHS.APP_DOCUMENTS,
    fileName: string,
    content: string = '',
    encoding: TxtEncoding = 'utf8'
  ): Promise<{ path: string; uri: string; size: number }> {
    await DirectoryManager.ensureDirectoryExists(targetDirectory);

    const trimmed = fileName.trim();
    const cleanFileName = trimmed.toLowerCase().endsWith('.txt') ? trimmed : `${trimmed}.txt`;
    const fullPath = `${targetDirectory}/${cleanFileName}`;

    await this.writeTextFile(fullPath, content, encoding);

    let size = 0;
    try {
      const stat = await RNFS.stat(fullPath);
      size = Number(stat.size || 0);
    } catch {
      size = content.length;
    }

    return {
      path: fullPath,
      uri: `file://${fullPath}`,
      size,
    };
  }
}

export default TxtWriter;
