import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BrowserItem } from '../services/fileBrowserService';
import { formatDate } from '../../../shared/utils';
import { useAppTheme } from '../../../shared/hooks';

interface FolderItemProps {
  item: BrowserItem;
  onPress: (item: BrowserItem) => void;
}

export const FolderItem: React.FC<FolderItemProps> = ({ item, onPress }) => {
  const { themeColors } = useAppTheme();

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
        <Text style={styles.folderIcon}>📁</Text>
      </View>

      <View style={styles.infoContainer}>
        <Text
          style={[styles.name, { color: themeColors.textPrimary }]}
          numberOfLines={1}
          ellipsizeMode="middle"
        >
          {item.name}
        </Text>
        <Text style={[styles.details, { color: themeColors.textSecondary }]}>
          {item.itemCount !== undefined ? `${item.itemCount} items` : 'Folder'}
          {item.modifiedAt ? ` • ${formatDate(item.modifiedAt)}` : ''}
        </Text>
      </View>

      <Text style={[styles.chevron, { color: themeColors.textSecondary }]}>›</Text>
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
  folderIcon: {
    fontSize: 22,
  },
  infoContainer: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  details: {
    fontSize: 12,
  },
  chevron: {
    fontSize: 22,
    fontWeight: '300',
    marginLeft: 8,
  },
});

export default FolderItem;
