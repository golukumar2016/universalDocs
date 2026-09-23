import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppTheme } from '../../../shared/hooks';

interface EmptyFolderProps {
  onRefresh?: () => void;
  message?: string;
}

export const EmptyFolder: React.FC<EmptyFolderProps> = ({
  onRefresh,
  message = 'This folder is empty.',
}) => {
  const { themeColors } = useAppTheme();

  return (
    <View style={styles.container}>
      <Text style={styles.emptyIcon}>📂</Text>
      <Text style={[styles.title, { color: themeColors.textPrimary }]}>{message}</Text>
      <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
        No files or subfolders found in this directory.
      </Text>

      {onRefresh && (
        <TouchableOpacity
          style={[
            styles.refreshButton,
            { backgroundColor: themeColors.cardSecondary, borderColor: themeColors.border },
          ]}
          onPress={onRefresh}
          activeOpacity={0.7}
        >
          <Text style={[styles.refreshText, { color: themeColors.primary }]}>
            Check Again
          </Text>
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 240,
    lineHeight: 18,
    marginBottom: 20,
  },
  refreshButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  refreshText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

export default EmptyFolder;
