/**
 * UniversalDocs - PDF Annotation Service
 * Coordinate normalization, annotation creation, native bridge integration, and SQLite persistence.
 */

import { NativeModules } from 'react-native';
import {
  PdfAnnotation,
  PdfAnnotationType,
  NormalizedPoint,
  NormalizedRect,
  AnnotationStyle,
  SaveAnnotatedPdfResult,
} from './annotation.types';
import { DocumentRepository } from '../../../../core/database/repositories/documentRepository';
import { RecentRepository } from '../../../../core/database/repositories/recentRepository';
import { DocumentItem } from '../../../../shared/types';

const { PdfAnnotationModule } = NativeModules;

export class AnnotationService {
  /**
   * Generates a unique annotation ID.
   */
  public static generateId(type: PdfAnnotationType): string {
    return `annot_${type}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  }

  /**
   * Normalizes screen/view coordinate to 0..1 relative to page dimensions.
   */
  public static normalizePoint(
    x: number,
    y: number,
    pageWidth: number,
    pageHeight: number
  ): NormalizedPoint {
    const pw = Math.max(1, pageWidth);
    const ph = Math.max(1, pageHeight);
    return {
      x: Math.max(0, Math.min(1, x / pw)),
      y: Math.max(0, Math.min(1, y / ph)),
    };
  }

  /**
   * Converts normalized point (0..1) to actual page display pixels.
   */
  public static denormalizePoint(
    point: NormalizedPoint,
    pageWidth: number,
    pageHeight: number
  ): { x: number; y: number } {
    return {
      x: point.x * pageWidth,
      y: point.y * pageHeight,
    };
  }

  /**
   * Normalizes a rectangle to 0..1 relative to page dimensions.
   * Ensures x, y, width, height are positive and clamped.
   */
  public static normalizeRect(
    x: number,
    y: number,
    width: number,
    height: number,
    pageWidth: number,
    pageHeight: number
  ): NormalizedRect {
    const pw = Math.max(1, pageWidth);
    const ph = Math.max(1, pageHeight);

    // Handle negative drag dimensions
    const realX = width >= 0 ? x : x + width;
    const realY = height >= 0 ? y : y + height;
    const realW = Math.abs(width);
    const realH = Math.abs(height);

    const nx = Math.max(0, Math.min(1, realX / pw));
    const ny = Math.max(0, Math.min(1, realY / ph));
    const nw = Math.max(0, Math.min(1 - nx, realW / pw));
    const nh = Math.max(0, Math.min(1 - ny, realH / ph));

    return { x: nx, y: ny, width: nw, height: nh };
  }

  /**
   * Converts normalized rect (0..1) to actual page display pixels.
   */
  public static denormalizeRect(
    rect: NormalizedRect,
    pageWidth: number,
    pageHeight: number
  ): { x: number; y: number; width: number; height: number } {
    return {
      x: rect.x * pageWidth,
      y: rect.y * pageHeight,
      width: rect.width * pageWidth,
      height: rect.height * pageHeight,
    };
  }

  /**
   * Creates a Highlight annotation.
   */
  public static createHighlight(
    documentId: string,
    pageIndex: number,
    bounds: NormalizedRect,
    color: string = '#FACC15',
    opacity: number = 0.38
  ): PdfAnnotation {
    const now = Date.now();
    return {
      id: this.generateId('highlight'),
      documentId,
      pageIndex,
      type: 'highlight',
      bounds,
      style: {
        color,
        opacity,
      },
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Creates an Underline annotation.
   */
  public static createUnderline(
    documentId: string,
    pageIndex: number,
    bounds: NormalizedRect,
    color: string = '#2563EB',
    strokeWidth: number = 2.5
  ): PdfAnnotation {
    const now = Date.now();
    return {
      id: this.generateId('underline'),
      documentId,
      pageIndex,
      type: 'underline',
      bounds,
      style: {
        color,
        opacity: 1.0,
        strokeWidth,
      },
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Creates a Strikethrough annotation.
   */
  public static createStrikethrough(
    documentId: string,
    pageIndex: number,
    bounds: NormalizedRect,
    color: string = '#DC2626',
    strokeWidth: number = 2.0
  ): PdfAnnotation {
    const now = Date.now();
    return {
      id: this.generateId('strikethrough'),
      documentId,
      pageIndex,
      type: 'strikethrough',
      bounds,
      style: {
        color,
        opacity: 1.0,
        strokeWidth,
      },
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Creates an Ink (Freehand pen) annotation.
   */
  public static createInk(
    documentId: string,
    pageIndex: number,
    points: NormalizedPoint[],
    color: string = '#1E293B',
    strokeWidth: number = 3.0,
    opacity: number = 1.0
  ): PdfAnnotation {
    const now = Date.now();
    return {
      id: this.generateId('ink'),
      documentId,
      pageIndex,
      type: 'ink',
      points,
      style: {
        color,
        strokeWidth,
        opacity,
      },
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Creates a Sticky Note annotation.
   */
  public static createNote(
    documentId: string,
    pageIndex: number,
    point: NormalizedPoint,
    text: string = '',
    color: string = '#F59E0B'
  ): PdfAnnotation {
    const now = Date.now();
    return {
      id: this.generateId('note'),
      documentId,
      pageIndex,
      type: 'note',
      bounds: {
        x: point.x,
        y: point.y,
        width: 0.05,
        height: 0.05,
      },
      text,
      style: {
        color,
        opacity: 1.0,
      },
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Calls native PdfAnnotationModule to generate a real, flattened, modified PDF.
   * Registers the generated PDF in SQLite DocumentRepository & RecentRepository.
   */
  public static async exportAndSaveAnnotatedPdf(
    originalUriOrPath: string,
    annotations: PdfAnnotation[],
    newFileName?: string
  ): Promise<{ result: SaveAnnotatedPdfResult; documentItem: DocumentItem }> {
    if (!PdfAnnotationModule || !PdfAnnotationModule.generateAnnotatedPdf) {
      throw new Error('Native PdfAnnotationModule is not available.');
    }

    const annotationsJson = JSON.stringify(annotations);
    const nativeResult: SaveAnnotatedPdfResult = await PdfAnnotationModule.generateAnnotatedPdf(
      originalUriOrPath,
      annotationsJson,
      newFileName
    );

    // Register with DocumentRepository (SQLite)
    const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = Date.now();
    const docItem: DocumentItem = {
      id: docId,
      name: nativeResult.fileName,
      path: nativeResult.filePath,
      uri: nativeResult.uri,
      extension: 'pdf',
      mimeType: 'application/pdf',
      size: nativeResult.size,
      folderId: null,
      isFavorite: false,
      isSecured: false,
      createdAt: now,
      updatedAt: now,
      lastOpenedAt: now,
    };

    try {
      await DocumentRepository.insert(docItem);
      await RecentRepository.addRecent(docId);
    } catch (dbErr) {
      console.warn('AnnotationService: Could not save metadata to SQLite:', dbErr);
    }

    return { result: nativeResult, documentItem: docItem };
  }

  /**
   * Loads structured annotations for a document ID if previously saved.
   */
  public static async loadAnnotations(documentId: string): Promise<PdfAnnotation[]> {
    if (!PdfAnnotationModule || !PdfAnnotationModule.loadAnnotationMetadata) {
      return [];
    }
    try {
      const jsonStr = await PdfAnnotationModule.loadAnnotationMetadata(documentId);
      if (!jsonStr || jsonStr.trim() === '[]') return [];
      return JSON.parse(jsonStr) as PdfAnnotation[];
    } catch {
      return [];
    }
  }

  /**
   * Saves structured annotations for a document ID without re-exporting the entire PDF.
   */
  public static async saveAnnotations(documentId: string, annotations: PdfAnnotation[]): Promise<boolean> {
    if (!PdfAnnotationModule || !PdfAnnotationModule.saveAnnotationMetadata) {
      return false;
    }
    try {
      return await PdfAnnotationModule.saveAnnotationMetadata(documentId, JSON.stringify(annotations));
    } catch {
      return false;
    }
  }
}
