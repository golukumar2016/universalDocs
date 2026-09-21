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
  DocumentViewer: { document: Document };
  UnsupportedDocument: { document?: Document; reason?: string };
  Editor: { documentId?: string; filePath?: string; title?: string; document?: Document };
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
};
