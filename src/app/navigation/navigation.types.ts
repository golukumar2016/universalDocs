import { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  DocumentsTab: undefined;
  SearchTab: undefined;
  ScannerTab: undefined;
  SecurityTab: undefined;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  Editor: { documentId?: string; filePath?: string; title?: string };
  DocumentViewer: { documentId: string; filePath: string; mimeType: string };
};
