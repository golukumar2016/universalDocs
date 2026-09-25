import { DocumentItem } from '../../../../shared/types';

export interface EditorState {
  document: DocumentItem | null;
  content: string;
  initialContent: string;
  isLoading: boolean;
  isSaving: boolean;
  isDirty: boolean;
  error?: string | null;
  statusMessage?: string | null;
}

export interface TxtSaveResult {
  success: boolean;
  document: DocumentItem;
  error?: string;
}

export interface TxtSaveAsOptions {
  fileName: string;
  directoryPath?: string;
  content?: string;
}

export type TxtEncoding = 'utf8' | 'ascii';

export const initialEditorState: EditorState = {
  document: null,
  content: '',
  initialContent: '',
  isLoading: true,
  isSaving: false,
  isDirty: false,
  error: null,
  statusMessage: null,
};

export type EditorAction =
  | { type: 'LOAD_START' }
  | { type: 'LOAD_SUCCESS'; document: DocumentItem; content: string }
  | { type: 'LOAD_ERROR'; error: string }
  | { type: 'CHANGE_CONTENT'; content: string }
  | { type: 'SAVE_START' }
  | { type: 'SAVE_SUCCESS'; document: DocumentItem }
  | { type: 'SAVE_ERROR'; error: string };

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'LOAD_START':
      return { ...state, isLoading: true, error: null };
    case 'LOAD_SUCCESS':
      return {
        ...state,
        isLoading: false,
        document: action.document,
        content: action.content,
        initialContent: action.content,
        isDirty: false,
        error: null,
      };
    case 'LOAD_ERROR':
      return { ...state, isLoading: false, error: action.error };
    case 'CHANGE_CONTENT':
      return {
        ...state,
        content: action.content,
        isDirty: action.content !== state.initialContent,
      };
    case 'SAVE_START':
      return { ...state, isSaving: true, error: null };
    case 'SAVE_SUCCESS':
      return {
        ...state,
        isSaving: false,
        document: action.document,
        initialContent: state.content,
        isDirty: false,
        statusMessage: 'Saved locally',
      };
    case 'SAVE_ERROR':
      return {
        ...state,
        isSaving: false,
        error: action.error,
        isDirty: true,
      };
    default:
      return state;
  }
}
