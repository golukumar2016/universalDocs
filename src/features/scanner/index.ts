import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const ScannerScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Document Scanner</Text>
      <Text style={styles.subtitle}>Scan physical documents using your camera</Text>
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

export default ScannerScreen;
