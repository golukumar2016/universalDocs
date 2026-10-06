import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface ScannerOverlayProps {
  instructionText?: string;
}

export const ScannerOverlay: React.FC<ScannerOverlayProps> = ({
  instructionText = 'Align document within frame',
}) => {
  return (
    <View style={styles.container} pointerEvents="none">
      {/* Top Mask */}
      <View style={styles.maskTop} />

      {/* Middle Row with Viewfinder Frame */}
      <View style={styles.middleRow}>
        <View style={styles.maskSide} />

        <View style={styles.viewfinderFrame}>
          {/* Corner Brackets */}
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />

          {/* Instruction Pill */}
          <View style={styles.instructionPill}>
            <Text style={styles.instructionText}>{instructionText}</Text>
          </View>
        </View>

        <View style={styles.maskSide} />
      </View>

      {/* Bottom Mask */}
      <View style={styles.maskBottom} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  maskTop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  middleRow: {
    flexDirection: 'row',
    height: '66%',
  },
  maskSide: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  viewfinderFrame: {
    width: '84%',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 8,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 16,
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#3B82F6',
  },
  cornerTL: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 8,
  },
  cornerBL: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },
  instructionPill: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  instructionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  maskBottom: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
});

export default ScannerOverlay;
