import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BrowserItem } from '../services/fileBrowserService';
import { formatFileSize, formatDate } from '../../../shared/utils';

interface FileItemProps {
  item: BrowserItem;
  onPress: (item: BrowserItem) => void;
}

export const FileItem: React.FC<FileItemProps> = ({ item, onPress }) => {
  const getFileIcon = (docType?: string) => {
    switch ((docType || '').toUpperCase()) {
      case 'PDF':
        return '📕';
      case 'TXT':
      case 'MD':
        return '📝';
      case 'DOC':
      case 'DOCX':
        return '📘';
      case 'XLS':
      case 'XLSX':
      case 'CSV':
        return '📊';
      case 'PPT':
      case 'PPTX':
        return '📙';
      default:
        return '📄';
    }
  };

  const formattedSize = item.size > 0 ? formatFileSize(item.size) : '0 B';
  const displayType = item.documentType !== 'UNSUPPORTED'
    ? item.documentType
    : (item.extension ? item.extension.toUpperCase() : 'FILE');

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.iconWrapper}>
        <Text style={styles.fileIcon}>{getFileIcon(item.documentType)}</Text>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.name} numberOfLines={1} ellipsizeMode="middle">
          {item.name}
        </Text>
        <Text style={styles.subtitle}>
          {displayType} • {formattedSize}
          {item.modifiedAt ? ` • ${formatDate(item.modifiedAt)}` : ''}
        </Text>
      </View>

      {!item.isSupported && (
        <View style={styles.unsupportedBadge}>
          <Text style={styles.unsupportedText}>Unknown</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  iconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  fileIcon: {
    fontSize: 22,
  },
  infoContainer: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '500',
    color: '#F8FAFC',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: '#94A3B8',
  },
  unsupportedBadge: {
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  unsupportedText: {
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: '600',
  },
});

export default FileItem;
