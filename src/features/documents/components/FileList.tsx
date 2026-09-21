import React from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
} from 'react-native';
import { BrowserItem } from '../services/fileBrowserService';
import { FolderItem } from './FolderItem';
import { FileItem } from './FileItem';
import { EmptyFolder } from './EmptyFolder';

interface FileListProps {
  items: BrowserItem[];
  isLoading: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  onFolderPress: (folder: BrowserItem) => void;
  onFilePress: (file: BrowserItem) => void;
  emptyMessage?: string;
}

export const FileList: React.FC<FileListProps> = ({
  items,
  isLoading,
  isRefreshing,
  onRefresh,
  onFolderPress,
  onFilePress,
  emptyMessage,
}) => {
  const renderItem = ({ item }: { item: BrowserItem }) => {
    if (item.isDirectory) {
      return <FolderItem item={item} onPress={onFolderPress} />;
    }
    return <FileItem item={item} onPress={onFilePress} />;
  };

  if (isLoading && !isRefreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#38BDF8" />
        <Text style={styles.loadingText}>Reading real folder contents...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id || item.path || item.uri}
      renderItem={renderItem}
      contentContainerStyle={styles.listContent}
      initialNumToRender={15}
      maxToRenderPerBatch={20}
      windowSize={11}
      removeClippedSubviews={true}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor="#38BDF8"
          colors={['#38BDF8', '#2563EB']}
        />
      }
      ListEmptyComponent={
        <EmptyFolder onRefresh={onRefresh} message={emptyMessage} />
      }
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#94A3B8',
  },
});

export default FileList;
