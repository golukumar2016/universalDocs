export interface PdfPageDimension {
  pageIndex: number;
  index?: number;
  pageNumber: number;
  width: number;
  height: number;
  aspectRatio: number;
}

export interface PdfDocumentSession {
  docId: string;
  documentId?: string;
  pageCount: number;
  pages: PdfPageDimension[];
}

export type PdfErrorType =
  | 'FILE_NOT_FOUND'
  | 'PASSWORD_PROTECTED'
  | 'INVALID_PDF'
  | 'EMPTY_PDF'
  | 'SESSION_EXPIRED'
  | 'RENDER_PAGE_FAILED'
  | 'NOT_FOUND'
  | 'RENDER_ERROR'
  | 'UNKNOWN';

export interface PdfServiceError {
  type: PdfErrorType;
  message: string;
  rawError?: any;
}

export interface RenderedPageResult {
  pageIndex: number;
  imagePath: string;
  width: number;
  height: number;
}

export interface PdfJumpValidationResult {
  valid: boolean;
  pageNumber?: number;
  targetPage?: number;
  error?: string;
}

export interface PdfViewerProps {
  documentId?: string;
  uri?: string;
  name?: string;
  document?: {
    id: string;
    name: string;
    uri: string;
    size?: number;
    mimeType?: string;
    extension?: string;
    createdAt?: number;
    modifiedAt?: number;
    path?: string;
  };
  onBack?: () => void;
}
