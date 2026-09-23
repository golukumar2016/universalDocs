import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BrowserItem } from '../services/fileBrowserService';
import { formatFileSize, formatDate } from '../../../shared/utils';
import { useAppTheme } from '../../../shared/hooks';

interface FileItemProps {
  item: BrowserItem;
  onPress: (item: BrowserItem) => void;
}

export const FileItem: React.FC<FileItemProps> = ({ item, onPress }) => {
  const { themeColors } = useAppTheme();

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
        return '📊';
      case 'CSV':
        return '📈';
      case 'PPT':
      case 'PPTX':
        return '📙';
      default:
        return '📄';
    }
  };

  const formattedSize = item.size > 0 ? formatFileSize(item.size) : '0 B';
  const displayType =
    item.documentType !== 'UNSUPPORTED'
      ? item.documentType
      : item.extension
      ? item.extension.toUpperCase()
      : 'FILE';

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: themeColors.card,
          borderColor: themeColors.border,
        },
      ]}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.iconWrapper,
          {
            backgroundColor: themeColors.cardSecondary,
            borderColor: themeColors.borderLight,
          },
        ]}
      >
        <Text style={styles.fileIcon}>{getFileIcon(item.documentType)}</Text>
      </View>

      <View style={styles.infoContainer}>
        <Text
          style={[styles.name, { color: themeColors.textPrimary }]}
          numberOfLines={1}
          ellipsizeMode="middle"
        >
          {item.name}
        </Text>
        <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
          {displayType} • {formattedSize}
          {item.modifiedAt ? ` • ${formatDate(item.modifiedAt)}` : ''}
        </Text>
      </View>

      {!item.isSupported && (
        <View
          style={[
            styles.unsupportedBadge,
            { backgroundColor: themeColors.cardSecondary },
          ]}
        >
          <Text style={[styles.unsupportedText, { color: themeColors.warning }]}>
            Unknown
          </Text>
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
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  iconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
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
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
  },
  unsupportedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  unsupportedText: {
    fontSize: 11,
    fontWeight: '600',
  },
});

export default FileItem;
