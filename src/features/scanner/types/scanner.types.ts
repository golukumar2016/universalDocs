export interface ScanCornerPoint {
  x: number;
  y: number;
}

export interface ScanDocumentCorners {
  topLeft: ScanCornerPoint;
  topRight: ScanCornerPoint;
  bottomRight: ScanCornerPoint;
  bottomLeft: ScanCornerPoint;
}

export type EnhancementMode =
  | 'ORIGINAL'
  | 'AUTO'
  | 'GRAYSCALE'
  | 'BLACK_AND_WHITE'
  | 'HIGH_CONTRAST';

export interface ScanPage {
  id: string;
  originalImagePath: string;
  croppedImagePath: string;
  enhancedImagePath: string;
  corners: ScanDocumentCorners;
  enhancementMode: EnhancementMode;
  rotation: number;
  width: number;
  height: number;
  timestamp: number;
}

export interface ScannerSession {
  id: string;
  pages: ScanPage[];
  createdAt: number;
}

export interface EdgeDetectionResult {
  width: number;
  height: number;
  filePath: string;
  corners: ScanDocumentCorners;
}

export interface CropTransformResult {
  imagePath: string;
  width: number;
  height: number;
}

export interface PdfGenerationResult {
  path: string;
  uri: string;
  fileName: string;
  pageCount: number;
  size: number;
}

export type ScannerStep =
  | 'CAMERA_CAPTURE'
  | 'CROP'
  | 'ENHANCE'
  | 'REVIEW'
  | 'SAVE';
