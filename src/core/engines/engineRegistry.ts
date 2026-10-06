import { DocumentEngine } from './types';
import { textDocumentEngine } from './txtEngine';
import { pdfDocumentEngine } from './pdfEngine';

export class EngineRegistry {
  private static instance: EngineRegistry;
  private engines: Map<string, DocumentEngine> = new Map();

  private constructor() {
    // Register built-in default engines
    this.registerEngine(textDocumentEngine);
    this.registerEngine(pdfDocumentEngine);
  }

  static getInstance(): EngineRegistry {
    if (!this.instance) {
      this.instance = new EngineRegistry();
    }
    return this.instance;
  }

  registerEngine(engine: DocumentEngine): void {
    this.engines.set(engine.id, engine);
  }

  getEngineForFile(extension: string, mimeType?: string): DocumentEngine | null {
    for (const engine of this.engines.values()) {
      if (engine.supports(extension, mimeType)) {
        return engine;
      }
    }
    // Fallback: If it's a known text-like file, return textDocumentEngine
    if (textDocumentEngine.supports(extension, mimeType)) {
      return textDocumentEngine;
    }
    return null;
  }

  getAllEngines(): DocumentEngine[] {
    return Array.from(this.engines.values());
  }

  getAllSupportedExtensions(): string[] {
    const extensions = new Set<string>();
    for (const engine of this.engines.values()) {
      for (const ext of engine.supportedExtensions) {
        extensions.add(ext);
      }
    }
    return Array.from(extensions);
  }
}

export const engineRegistry = EngineRegistry.getInstance();
export default engineRegistry;
