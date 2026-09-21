import { DocumentItem } from '../../shared/types';

export interface DocumentEngine {
  readonly id: string;
  readonly name: string;
  readonly supportedExtensions: string[];
  readonly supportedMimeTypes: string[];

  supports(extension: string, mimeType?: string): boolean;
  loadContent(filePath: string): Promise<string>;
  saveContent(filePath: string, content: string): Promise<void>;
  createNewFile(
    directoryPath: string,
    fileName: string,
    initialContent?: string
  ): Promise<{ path: string; size: number }>;
}
