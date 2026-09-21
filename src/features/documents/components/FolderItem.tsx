import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BrowserItem } from '../services/fileBrowserService';
import { formatDate } from '../../../shared/utils';

interface FolderItemProps {
  item: BrowserItem;
  onPress: (item: BrowserItem) => void;
}

export const FolderItem: React.FC<FolderItemProps> = ({ item, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.iconWrapper}>
        <Text style={styles.folderIcon}>📁</Text>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.name} numberOfLines={1} ellipsizeMode="middle">
          {item.name}
        </Text>
        <Text style={styles.details}>
          {item.itemCount !== undefined ? `${item.itemCount} items` : 'Folder'}
          {item.modifiedAt ? ` • ${formatDate(item.modifiedAt)}` : ''}
        </Text>
      </View>

      <Text style={styles.chevron}>›</Text>
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
  folderIcon: {
    fontSize: 22,
  },
  infoContainer: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 2,
  },
  details: {
    fontSize: 12,
    color: '#94A3B8',
  },
  chevron: {
    fontSize: 22,
    color: '#64748B',
    fontWeight: '300',
    marginLeft: 8,
  },
});

export default FolderItem;
