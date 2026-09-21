export const APP_NAME = 'UniversalDocs';

export const STORAGE_KEYS = {
  SETTINGS: '@universal_docs:settings',
  THEME_MODE: '@universal_docs:theme_mode',
  AUTH_PIN: '@universal_docs:auth_pin',
  BIOMETRIC_ENABLED: '@universal_docs:biometric_enabled',
} as const;

export const DEFAULT_PAGE_SIZE = 20;

export const SUPPORTED_EXTENSIONS: Record<string, string> = {
  pdf: 'application/pdf',
  txt: 'text/plain',
  md: 'text/markdown',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
};
