import { AppError } from './AppError';

export interface ErrorReport {
  message: string;
  code: string;
  stack?: string;
  timestamp: number;
  details?: unknown;
}

export class ErrorHandler {
  static handle(error: unknown): ErrorReport {
    const timestamp = Date.now();

    if (error instanceof AppError) {
      const report: ErrorReport = {
        message: error.message,
        code: error.code,
        stack: error.stack,
        timestamp,
        details: error.details,
      };
      console.error(`[ErrorHandler - ${error.code}]`, error.message, error.details);
      return report;
    }

    if (error instanceof Error) {
      const report: ErrorReport = {
        message: error.message,
        code: 'UNKNOWN_ERROR',
        stack: error.stack,
        timestamp,
      };
      console.error('[ErrorHandler - Standard Error]', error.message);
      return report;
    }

    const report: ErrorReport = {
      message: String(error),
      code: 'UNKNOWN_ERROR',
      timestamp,
      details: error,
    };
    console.error('[ErrorHandler - Unhandled Exception]', error);
    return report;
  }
}

export default ErrorHandler;
