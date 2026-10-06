/**
 * UniversalDocs - PDF Annotation Types
 * Strongly-typed data models for offline PDF annotations with normalized coordinates.
 */

export type PdfAnnotationType =
  | 'highlight'
  | 'underline'
  | 'strikethrough'
  | 'ink'
  | 'note';

export type AnnotationTool =
  | 'select'
  | 'highlight'
  | 'underline'
  | 'strikethrough'
  | 'ink'
  | 'note'
  | 'eraser';

export interface NormalizedPoint {
  x: number; // 0..1 relative to page width
  y: number; // 0..1 relative to page height
}

export interface NormalizedRect {
  x: number;      // 0..1 relative to page width
  y: number;      // 0..1 relative to page height
  width: number;  // 0..1 relative to page width
  height: number; // 0..1 relative to page height
}

export interface AnnotationStyle {
  color: string;         // Hex format e.g. '#FACC15', '#EF4444'
  opacity?: number;      // 0..1 (default 0.35 for highlight, 1.0 for others)
  strokeWidth?: number;  // In points (default 2..4)
}

export interface PdfAnnotation {
  id: string;
  documentId: string;
  pageIndex: number; // 0-indexed
  type: PdfAnnotationType;
  bounds?: NormalizedRect;
  points?: NormalizedPoint[];
  text?: string; // Content for sticky notes
  style: AnnotationStyle;
  createdAt: number;
  updatedAt: number;
}

export interface SaveAnnotatedPdfResult {
  filePath: string;
  uri: string;
  fileName: string;
  pageCount: number;
  size: number;
  annotationsSidecar?: string;
}

export interface AnnotationHistoryAction {
  type: 'ADD' | 'DELETE' | 'UPDATE';
  annotation: PdfAnnotation;
  previousAnnotation?: PdfAnnotation;
}
