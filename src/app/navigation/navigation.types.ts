import { NavigatorScreenParams } from '@react-navigation/native';
import { Document } from '../../shared/types';

export type MainTabParamList = {
  DocumentsTab: undefined;
  SearchTab: undefined;
  ScannerTab: undefined;
  SecurityTab: undefined;
};

export type RootStackParamList = {
  InitialDocument: undefined;
  FileBrowser: { initialLocation?: { name: string; path: string; isContentUri: boolean } } | undefined;
  Folder?: { folderPath: string; folderName: string };
  DocumentViewer: { document: Document };
  UnsupportedDocument: { document?: Document; reason?: string };
  Editor: { documentId?: string; filePath?: string; title?: string; document?: Document };
  Scanner: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
};
