import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface EmptyFolderProps {
  onRefresh?: () => void;
  message?: string;
}

export const EmptyFolder: React.FC<EmptyFolderProps> = ({
  onRefresh,
  message = 'This folder is empty.',
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.emptyIcon}>📂</Text>
      <Text style={styles.title}>{message}</Text>
      <Text style={styles.subtitle}>
        No files or subfolders found in this directory.
      </Text>

      {onRefresh && (
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh} activeOpacity={0.7}>
          <Text style={styles.refreshText}>Check Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    fontSize: 54,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    maxWidth: 240,
    lineHeight: 18,
    marginBottom: 20,
  },
  refreshButton: {
    backgroundColor: '#334155',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  refreshText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default EmptyFolder;
