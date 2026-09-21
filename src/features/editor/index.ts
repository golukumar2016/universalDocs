import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const EditorScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Document Editor</Text>
      <Text style={styles.subtitle}>Edit and preview file contents</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
});

export default EditorScreen;
