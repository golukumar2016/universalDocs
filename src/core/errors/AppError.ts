export type ErrorCode =
  | 'FILE_SYSTEM_ERROR'
  | 'FILE_NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'DATABASE_ERROR'
  | 'STORAGE_ERROR'
  | 'SECURITY_ERROR'
  | 'AUTH_FAILED'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class FileSystemError extends AppError {
  constructor(message: string, details?: unknown) {
    super('FILE_SYSTEM_ERROR', message, details);
    this.name = 'FileSystemError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: unknown) {
    super('DATABASE_ERROR', message, details);
    this.name = 'DatabaseError';
  }
}

export class PermissionError extends AppError {
  constructor(message: string, details?: unknown) {
    super('PERMISSION_DENIED', message, details);
    this.name = 'PermissionError';
  }
}

export class SecurityError extends AppError {
  constructor(message: string, details?: unknown) {
    super('SECURITY_ERROR', message, details);
    this.name = 'SecurityError';
  }
}
