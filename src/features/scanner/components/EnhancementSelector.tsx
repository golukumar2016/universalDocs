import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../../shared/hooks';
import { EnhancementMode } from '../types/scanner.types';
import { ScannerService } from '../services/scannerService';

export interface EnhancementSelectorProps {
  croppedImagePath: string;
  onBackToCrop: () => void;
  onConfirmPage: (enhancedImagePath: string, mode: EnhancementMode) => void;
}

const MODES: { id: EnhancementMode; label: string; icon: string }[] = [
  { id: 'ORIGINAL', label: 'Original', icon: '📸' },
  { id: 'AUTO', label: 'Auto', icon: '✨' },
  { id: 'GRAYSCALE', label: 'Grayscale', icon: '🌓' },
  { id: 'BLACK_AND_WHITE', label: 'B & W', icon: '📄' },
  { id: 'HIGH_CONTRAST', label: 'Contrast', icon: '🔲' },
];

export const EnhancementSelector: React.FC<EnhancementSelectorProps> = ({
  croppedImagePath,
  onBackToCrop,
  onConfirmPage,
}) => {
  const insets = useSafeAreaInsets();
  const { themeColors } = useAppTheme();
  const screen = Dimensions.get('window');

  const [currentMode, setCurrentMode] = useState<EnhancementMode>('ORIGINAL');
  const [currentPreviewUri, setCurrentPreviewUri] = useState<string>(croppedImagePath);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Cache applied filter outputs to allow instant switching
  const [modeCache, setModeCache] = useState<Record<string, string>>({
    ORIGINAL: croppedImagePath,
  });

  const handleSelectMode = async (mode: EnhancementMode) => {
    if (mode === currentMode) return;
    setCurrentMode(mode);

    if (modeCache[mode]) {
      setCurrentPreviewUri(modeCache[mode]);
      return;
    }

    try {
      setIsProcessing(true);
      const enhanced = await ScannerService.enhanceImage(croppedImagePath, mode);
      setModeCache(prev => ({ ...prev, [mode]: enhanced }));
      setCurrentPreviewUri(enhanced);
    } catch (err) {
      console.warn('Enhancement failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = () => {
    onConfirmPage(currentPreviewUri, currentMode);
  };

  return (
    <View style={[styles.container, { backgroundColor: '#111827' }]}>
      {/* Top Header */}
      <View
        style={[
          styles.topToolbar,
          {
            paddingTop: Math.max(insets.top, 20) + 4,
          },
        ]}
      >
        <TouchableOpacity
          onPress={onBackToCrop}
          style={styles.toolBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.toolBtnText}>← Back to Crop</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Enhance Page</Text>

        <View style={{ width: 60 }} />
      </View>

      {/* Main Preview */}
      <View style={styles.previewContainer}>
        <Image
          source={{ uri: currentPreviewUri }}
          style={styles.previewImage}
          resizeMode="contain"
        />

        {isProcessing && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>Applying filter...</Text>
          </View>
        )}
      </View>

      {/* Filter Mode Selector Pills */}
      <View
        style={[
          styles.bottomControlContainer,
          {
            backgroundColor: themeColors.surface,
            paddingBottom: Math.max(insets.bottom, 16) + 12,
          },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.modesScroll}
        >
          {MODES.map(item => {
            const isSelected = item.id === currentMode;
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => handleSelectMode(item.id)}
                style={[
                  styles.modePill,
                  {
                    backgroundColor: isSelected
                      ? themeColors.primary
                      : themeColors.cardSecondary,
                    borderColor: isSelected
                      ? themeColors.primary
                      : themeColors.border,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Text style={styles.modeIcon}>{item.icon}</Text>
                <Text
                  style={[
                    styles.modeLabel,
                    {
                      color: isSelected ? '#FFFFFF' : themeColors.textPrimary,
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Action Button */}
        <TouchableOpacity
          style={[styles.confirmBtn, { backgroundColor: themeColors.primary }]}
          onPress={handleConfirm}
          disabled={isProcessing}
          activeOpacity={0.8}
        >
          <Text style={styles.confirmBtnText}>Add Page to Session ✓</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  toolBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  toolBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  previewContainer: {
    flex: 1,
    marginHorizontal: 16,
    marginVertical: 10,
    backgroundColor: '#000000',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
  },
  bottomControlContainer: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modesScroll: {
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 16,
  },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  modeIcon: {
    fontSize: 15,
  },
  modeLabel: {
    fontSize: 13,
  },
  confirmBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default EnhancementSelector;
