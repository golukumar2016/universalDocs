import {
  initialEditorState,
  editorReducer,
  EditorState,
} from '../../src/features/editor/engines/txt/txt.types';
import { DocumentItem } from '../../src/shared/types';

describe('EditorState Lifecycle', () => {
  const sampleDoc: DocumentItem = {
    id: 'doc_state_test',
    name: 'Test.txt',
    uri: 'file:///path/Test.txt',
    path: '/path/Test.txt',
    size: 15,
    mimeType: 'text/plain',
    extension: 'txt',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  it('provides a clean initial state with loading true and dirty false', () => {
    expect(initialEditorState.isLoading).toBe(true);
    expect(initialEditorState.isDirty).toBe(false);
    expect(initialEditorState.isSaving).toBe(false);
    expect(initialEditorState.content).toBe('');
    expect(initialEditorState.document).toBeNull();
  });

  it('transitions to loaded state upon LOAD_SUCCESS', () => {
    const loaded = editorReducer(initialEditorState, {
      type: 'LOAD_SUCCESS',
      document: sampleDoc,
      content: 'Original content',
    });

    expect(loaded.isLoading).toBe(false);
    expect(loaded.document?.name).toBe('Test.txt');
    expect(loaded.content).toBe('Original content');
    expect(loaded.initialContent).toBe('Original content');
    expect(loaded.isDirty).toBe(false);
  });

  it('detects dirty state when content changes and resets when reverted', () => {
    const loaded = editorReducer(initialEditorState, {
      type: 'LOAD_SUCCESS',
      document: sampleDoc,
      content: 'Original content',
    });

    // Edit text
    const edited = editorReducer(loaded, {
      type: 'CHANGE_CONTENT',
      content: 'Original content with new edits',
    });
    expect(edited.isDirty).toBe(true);
    expect(edited.content).toBe('Original content with new edits');

    // Revert text to original
    const reverted = editorReducer(edited, {
      type: 'CHANGE_CONTENT',
      content: 'Original content',
    });
    expect(reverted.isDirty).toBe(false);
  });

  it('manages saving state and transitions on save success', () => {
    const edited: EditorState = {
      ...initialEditorState,
      isLoading: false,
      document: sampleDoc,
      content: 'Edited content',
      initialContent: 'Original content',
      isDirty: true,
    };

    // Start save
    const saving = editorReducer(edited, { type: 'SAVE_START' });
    expect(saving.isSaving).toBe(true);
    expect(saving.isDirty).toBe(true);

    // Save success
    const updatedDoc: DocumentItem = {
      ...sampleDoc,
      size: 'Edited content'.length,
      updatedAt: Date.now(),
    };
    const saved = editorReducer(saving, {
      type: 'SAVE_SUCCESS',
      document: updatedDoc,
    });

    expect(saved.isSaving).toBe(false);
    expect(saved.isDirty).toBe(false);
    expect(saved.initialContent).toBe('Edited content');
    expect(saved.statusMessage).toBe('Saved locally');
  });

  it('manages save failure, retaining dirty state and setting error message', () => {
    const saving: EditorState = {
      ...initialEditorState,
      isLoading: false,
      document: sampleDoc,
      content: 'Edited content',
      initialContent: 'Original content',
      isDirty: true,
      isSaving: true,
    };

    const failed = editorReducer(saving, {
      type: 'SAVE_ERROR',
      error: 'Disk I/O error',
    });

    expect(failed.isSaving).toBe(false);
    expect(failed.isDirty).toBe(true);
    expect(failed.error).toBe('Disk I/O error');
  });
});
