import React from 'react';
import { useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../app/navigation/navigation.types';
import { TXTEditor } from './engines/txt/TXTEditor';

type EditorScreenRouteProp = RouteProp<RootStackParamList, 'Editor'>;

export const EditorScreen: React.FC = () => {
  const route = useRoute<EditorScreenRouteProp>();
  const { documentId, filePath, title, document } = route.params || {};

  return (
    <TXTEditor
      documentId={documentId}
      filePath={filePath}
      title={title}
      document={document}
    />
  );
};

export default EditorScreen;
