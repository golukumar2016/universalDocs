import { DocumentEngine } from './types';
import { FileReader } from '../filesystem/fileReader';
import { FileWriter } from '../filesystem/fileWriter';
import { FileSystem } from '../filesystem/fileSystem';

export class TextDocumentEngine implements DocumentEngine {
  readonly id = 'text-engine';
  readonly name = 'Plain Text & Markdown Engine';

  readonly supportedExtensions = ['txt', 'md', 'csv', 'json', 'log', 'xml', 'yaml', 'yml'];
  readonly supportedMimeTypes = [
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/json',
    'text/xml',
  ];

  supports(extension: string, mimeType?: string): boolean {
    const cleanExt = extension.toLowerCase().replace('.', '');
    if (this.supportedExtensions.includes(cleanExt)) return true;
    if (mimeType && this.supportedMimeTypes.includes(mimeType.toLowerCase())) return true;
    return false;
  }

  async loadContent(filePath: string): Promise<string> {
    return await FileReader.readText(filePath, 'utf8');
  }

  async saveContent(filePath: string, content: string): Promise<void> {
    await FileWriter.writeText(filePath, content, 'utf8');
  }

  async createNewFile(
    directoryPath: string,
    fileName: string,
    initialContent: string = ''
  ): Promise<{ path: string; size: number }> {
    const cleanName = fileName.includes('.') ? fileName : `${fileName}.txt`;
    const fullPath = `${directoryPath}/${cleanName}`;
    await FileWriter.writeText(fullPath, initialContent, 'utf8');
    const stats = await FileSystem.stat(fullPath);
    return {
      path: fullPath,
      size: Number(stats.size || 0),
    };
  }
}

export const textDocumentEngine = new TextDocumentEngine();
export default textDocumentEngine;
