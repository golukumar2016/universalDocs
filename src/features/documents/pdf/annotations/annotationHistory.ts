/**
 * UniversalDocs - PDF Annotation History Manager
 * Manages bounded Undo and Redo operations for offline PDF annotations.
 */

import { PdfAnnotation, AnnotationHistoryAction } from './annotation.types';

export class AnnotationHistory {
  private undoStack: AnnotationHistoryAction[] = [];
  private redoStack: AnnotationHistoryAction[] = [];
  private readonly maxHistory: number;

  constructor(maxHistory: number = 50) {
    this.maxHistory = maxHistory;
  }

  /**
   * Records a user action (ADD, DELETE, UPDATE) and clears redo stack.
   */
  public push(action: AnnotationHistoryAction): void {
    this.undoStack.push(action);
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Performs an undo operation on the current annotations array.
   */
  public undo(current: PdfAnnotation[]): { updated: PdfAnnotation[]; action?: AnnotationHistoryAction } {
    if (!this.canUndo()) {
      return { updated: current };
    }

    const action = this.undoStack.pop()!;
    this.redoStack.push(action);

    let updated: PdfAnnotation[];
    switch (action.type) {
      case 'ADD':
        // Undo ADD -> Remove annotation
        updated = current.filter(a => a.id !== action.annotation.id);
        break;

      case 'DELETE':
        // Undo DELETE -> Re-add annotation
        updated = [...current, action.annotation];
        break;

      case 'UPDATE':
        // Undo UPDATE -> Restore previous annotation state
        if (action.previousAnnotation) {
          updated = current.map(a =>
            a.id === action.annotation.id ? action.previousAnnotation! : a
          );
        } else {
          updated = current;
        }
        break;

      default:
        updated = current;
    }

    return { updated, action };
  }

  /**
   * Performs a redo operation on the current annotations array.
   */
  public redo(current: PdfAnnotation[]): { updated: PdfAnnotation[]; action?: AnnotationHistoryAction } {
    if (!this.canRedo()) {
      return { updated: current };
    }

    const action = this.redoStack.pop()!;
    this.undoStack.push(action);

    let updated: PdfAnnotation[];
    switch (action.type) {
      case 'ADD':
        // Redo ADD -> Re-insert annotation
        updated = [...current, action.annotation];
        break;

      case 'DELETE':
        // Redo DELETE -> Remove annotation again
        updated = current.filter(a => a.id !== action.annotation.id);
        break;

      case 'UPDATE':
        // Redo UPDATE -> Re-apply modified annotation
        updated = current.map(a =>
          a.id === action.annotation.id ? action.annotation : a
        );
        break;

      default:
        updated = current;
    }

    return { updated, action };
  }

  public clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}
