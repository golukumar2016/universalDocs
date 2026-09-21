import React from 'react';
import { useRoute, RouteProp } from '@react-navigation/native';
import { FileBrowserScreen } from './FileBrowserScreen';
import { RootStackParamList } from '../../../app/navigation/navigation.types';

export const FolderScreen: React.FC = () => {
  return <FileBrowserScreen />;
};

export default FolderScreen;
