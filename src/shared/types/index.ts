export interface Document {
  id: string;
  name: string;
  uri: string;
  mimeType: string;
  extension: string;
  size?: number;
  createdAt?: number;
  modifiedAt?: number;
}

export interface DocumentItem {
  id: string;
  name: string;
  uri: string;
  path: string;
  size: number;
  mimeType: string;
  extension: string;
  folderId?: string | null;
  createdAt: number;
  updatedAt: number;
  lastOpenedAt?: number | null;
  isFavorite?: boolean;
  isSecured?: boolean;
}

export interface FolderItem {
  id: string;
  name: string;
  path: string;
  parentId?: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface RecentItem {
  id: string;
  documentId: string;
  openedAt: number;
}

export type SupportedFileType =
  | 'pdf'
  | 'txt'
  | 'md'
  | 'doc'
  | 'docx'
  | 'xls'
  | 'xlsx'
  | 'png'
  | 'jpg'
  | 'jpeg'
  | 'other';
