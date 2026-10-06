import { AnnotationHistory } from '../../src/features/documents/pdf/annotations/annotationHistory';
import { PdfAnnotation } from '../../src/features/documents/pdf/annotations/annotation.types';

describe('AnnotationHistory', () => {
  let history: AnnotationHistory;

  const mockAnnotationA: PdfAnnotation = {
    id: 'annot_1',
    documentId: 'doc_1',
    pageIndex: 0,
    type: 'highlight',
    bounds: { x: 0.1, y: 0.1, width: 0.5, height: 0.05 },
    style: { color: '#FACC15', opacity: 0.38 },
    createdAt: 1000,
    updatedAt: 1000,
  };

  const mockAnnotationB: PdfAnnotation = {
    id: 'annot_2',
    documentId: 'doc_1',
    pageIndex: 0,
    type: 'underline',
    bounds: { x: 0.2, y: 0.3, width: 0.4, height: 0.02 },
    style: { color: '#3B82F6', strokeWidth: 2 },
    createdAt: 2000,
    updatedAt: 2000,
  };

  beforeEach(() => {
    history = new AnnotationHistory(50);
  });

  it('starts with empty history and false undo/redo flags', () => {
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(false);
  });

  it('correctly handles ADD action undo and redo', () => {
    history.push({ type: 'ADD', annotation: mockAnnotationA });
    expect(history.canUndo()).toBe(true);
    expect(history.canRedo()).toBe(false);

    // Initial state after adding
    const current = [mockAnnotationA];

    // Undo ADD -> Should remove annotation
    const undoResult = history.undo(current);
    expect(undoResult.updated).toHaveLength(0);
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(true);

    // Redo ADD -> Should re-add annotation
    const redoResult = history.redo(undoResult.updated);
    expect(redoResult.updated).toHaveLength(1);
    expect(redoResult.updated[0].id).toBe('annot_1');
    expect(history.canUndo()).toBe(true);
    expect(history.canRedo()).toBe(false);
  });

  it('correctly handles DELETE action undo and redo', () => {
    history.push({ type: 'DELETE', annotation: mockAnnotationA });
    expect(history.canUndo()).toBe(true);

    // Current state after deleting is empty
    const current: PdfAnnotation[] = [];

    // Undo DELETE -> Should re-insert deleted annotation
    const undoResult = history.undo(current);
    expect(undoResult.updated).toHaveLength(1);
    expect(undoResult.updated[0].id).toBe('annot_1');
    expect(history.canRedo()).toBe(true);

    // Redo DELETE -> Should remove annotation again
    const redoResult = history.redo(undoResult.updated);
    expect(redoResult.updated).toHaveLength(0);
    expect(history.canUndo()).toBe(true);
    expect(history.canRedo()).toBe(false);
  });

  it('correctly handles UPDATE action undo and redo for sticky notes', () => {
    const updatedAnnot: PdfAnnotation = {
      ...mockAnnotationA,
      text: 'Updated note comment',
      updatedAt: 1500,
    };

    history.push({
      type: 'UPDATE',
      annotation: updatedAnnot,
      previousAnnotation: mockAnnotationA,
    });

    const current = [updatedAnnot];

    // Undo UPDATE -> Should restore previous annotation state
    const undoResult = history.undo(current);
    expect(undoResult.updated).toHaveLength(1);
    expect(undoResult.updated[0].text).toBeUndefined();

    // Redo UPDATE -> Should apply the updated annotation state
    const redoResult = history.redo(undoResult.updated);
    expect(redoResult.updated).toHaveLength(1);
    expect(redoResult.updated[0].text).toBe('Updated note comment');
  });

  it('clears redo stack when a new action is pushed after undo', () => {
    history.push({ type: 'ADD', annotation: mockAnnotationA });
    history.undo([mockAnnotationA]);
    expect(history.canRedo()).toBe(true);

    // Pushing a new action must invalidate existing redo branch
    history.push({ type: 'ADD', annotation: mockAnnotationB });
    expect(history.canRedo()).toBe(false);
  });

  it('enforces maximum history bounds', () => {
    const smallHistory = new AnnotationHistory(3);
    for (let i = 1; i <= 5; i++) {
      smallHistory.push({
        type: 'ADD',
        annotation: { ...mockAnnotationA, id: `annot_${i}` },
      });
    }

    // Only 3 items should remain on undo stack
    let count = 0;
    let list: PdfAnnotation[] = [];
    while (smallHistory.canUndo()) {
      smallHistory.undo(list);
      count++;
    }
    expect(count).toBe(3);
  });

  it('clears all history on clear()', () => {
    history.push({ type: 'ADD', annotation: mockAnnotationA });
    history.push({ type: 'ADD', annotation: mockAnnotationB });
    history.clear();

    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(false);
  });
});
