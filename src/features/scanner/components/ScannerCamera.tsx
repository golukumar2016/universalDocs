import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  AppState,
  AppStateStatus,
  SafeAreaView,
} from 'react-native';
import {
  Camera,
  CameraRef,
  useCameraDevice,
  usePhotoOutput,
} from 'react-native-vision-camera';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { pick, types } from '@react-native-documents/picker';
import { useAppTheme } from '../../../shared/hooks';
import { PermissionService } from '../../../core/permissions/permissionService';
import { ScannerOverlay } from './ScannerOverlay';

export interface ScannerCameraProps {
  pageCount: number;
  onPhotoCaptured: (imagePath: string, width: number, height: number) => void;
  onGoToReview: () => void;
  onClose: () => void;
}

export const ScannerCamera: React.FC<ScannerCameraProps> = ({
  pageCount,
  onPhotoCaptured,
  onGoToReview,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const { themeColors } = useAppTheme();
  const isFocused = useIsFocused();

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraPosition, setCameraPosition] = useState<'back' | 'front'>('back');
  const [isFlashOn, setIsFlashOn] = useState<boolean>(false);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [appState, setAppState] = useState<AppStateStatus>(
    (AppState.currentState as AppStateStatus) ?? 'active'
  );

  const cameraRef = useRef<CameraRef>(null);
  const device = useCameraDevice(cameraPosition);
  const photoOutput = usePhotoOutput();

  // AppState listener for background/foreground resource cleanup
  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      setAppState(nextState);
    });
    return () => sub.remove();
  }, []);

  // Check camera permission on mount
  const checkPermission = useCallback(async () => {
    try {
      const granted = await PermissionService.checkCameraPermission();
      setHasPermission(granted);
    } catch {
      setHasPermission(false);
    }
  }, []);

  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  const handleRequestPermission = async () => {
    try {
      const granted = await PermissionService.requestCameraPermission();
      setHasPermission(granted);
      if (!granted) {
        Alert.alert(
          'Permission Required',
          'Camera access is required to scan physical documents into PDF format.'
        );
      }
    } catch (err: any) {
      Alert.alert('Permission Error', err?.message || 'Could not request camera permission.');
    }
  };

  // Capture photo
  const handleCapture = async () => {
    if (!photoOutput || isCapturing) return;

    try {
      setIsCapturing(true);
      const photo = await photoOutput.capturePhoto(
        {
          flashMode: isFlashOn ? 'on' : 'off',
        },
        {}
      );

      const tempPath = await photo.saveToTemporaryFileAsync();
      const photoWidth = photo.width;
      const photoHeight = photo.height;
      photo.dispose();

      const photoPath = tempPath.startsWith('file://') ? tempPath : `file://${tempPath}`;
      onPhotoCaptured(photoPath, photoWidth, photoHeight);
    } catch (err: any) {
      Alert.alert('Capture Failed', err?.message || 'Could not capture document image.');
    } finally {
      setIsCapturing(false);
    }
  };

  // Import image from storage / gallery
  const handleImportImage = async () => {
    try {
      const [res] = await pick({
        type: [types.images],
        mode: 'open',
      });

      if (res && res.uri) {
        onPhotoCaptured(res.uri, 1200, 1600);
      }
    } catch (err: any) {
      if (err?.code !== 'DOCUMENT_PICKER_CANCELED') {
        // user didn't cancel
        console.warn('Import image failed:', err);
      }
    }
  };

  // Toggle camera direction
  const handleToggleCamera = () => {
    setCameraPosition(prev => (prev === 'back' ? 'front' : 'back'));
  };

  const isCameraActive = isFocused && appState === 'active';

  // Permission Denied View
  if (hasPermission === false) {
    return (
      <SafeAreaView style={[styles.centerContainer, { backgroundColor: themeColors.background }]}>
        <View style={[styles.permissionCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <Text style={styles.permIcon}>📷</Text>
          <Text style={[styles.permTitle, { color: themeColors.textPrimary }]}>
            Camera Permission Required
          </Text>
          <Text style={[styles.permSubtitle, { color: themeColors.textSecondary }]}>
            UniversalDocs needs camera access to capture physical paper documents offline.
          </Text>

          <TouchableOpacity
            style={[styles.permBtn, { backgroundColor: themeColors.primary }]}
            onPress={handleRequestPermission}
            activeOpacity={0.8}
          >
            <Text style={styles.permBtnText}>Grant Camera Permission</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.importBtn, { borderColor: themeColors.border }]}
            onPress={handleImportImage}
            activeOpacity={0.8}
          >
            <Text style={[styles.importBtnText, { color: themeColors.textPrimary }]}>
              🖼️ Import Image Instead
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={styles.closeTextBtn}>
            <Text style={[styles.closeText, { color: themeColors.textMuted }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Camera Device Unavailable or Initializing
  if (!device) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: '#000000' }]}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Initializing camera hardware...</Text>

        <TouchableOpacity
          style={[styles.importBtn, { borderColor: 'rgba(255, 255, 255, 0.3)', marginTop: 24 }]}
          onPress={handleImportImage}
        >
          <Text style={[styles.importBtnText, { color: '#FFFFFF' }]}>
            🖼️ Import from Device Storage
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onClose} style={styles.closeTextBtn}>
          <Text style={[styles.closeText, { color: '#9CA3AF' }]}>Close Scanner</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Live Camera Viewfinder */}
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        outputs={[photoOutput]}
        isActive={isCameraActive}
        enableNativeZoomGesture={true}
      />

      {/* Viewfinder Framing Overlay */}
      <ScannerOverlay instructionText="Position paper document within frame" />

      {/* Top Floating Controls */}
      <View style={[styles.topBar, { top: Math.max(insets.top, 24) + 8 }]}>
        <TouchableOpacity
          onPress={onClose}
          style={styles.iconCircleBtn}
          accessibilityLabel="Close scanner"
        >
          <Text style={styles.iconText}>✕</Text>
        </TouchableOpacity>

        <View style={styles.topRightRow}>
          <TouchableOpacity
            onPress={() => setIsFlashOn(prev => !prev)}
            style={[styles.iconCircleBtn, isFlashOn && styles.iconActiveBtn]}
            accessibilityLabel="Toggle flash"
          >
            <Text style={styles.iconText}>{isFlashOn ? '⚡' : '🌩️'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleToggleCamera}
            style={styles.iconCircleBtn}
            accessibilityLabel="Switch camera"
          >
            <Text style={styles.iconText}>🔄</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Floating Shutter & Actions */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 20) + 12 }]}>
        {/* Import from Gallery */}
        <TouchableOpacity
          onPress={handleImportImage}
          style={styles.actionCircleBtn}
          accessibilityLabel="Import from photos"
        >
          <Text style={styles.actionEmoji}>🖼️</Text>
          <Text style={styles.actionLabel}>Import</Text>
        </TouchableOpacity>

        {/* Shutter Button */}
        <TouchableOpacity
          onPress={handleCapture}
          disabled={isCapturing}
          style={styles.shutterOuter}
          activeOpacity={0.8}
          accessibilityLabel="Capture document page"
        >
          <View style={[styles.shutterInner, isCapturing && styles.shutterCapturing]}>
            {isCapturing && <ActivityIndicator size="small" color="#FFFFFF" />}
          </View>
        </TouchableOpacity>

        {/* Page Count / Review Pill */}
        {pageCount > 0 ? (
          <TouchableOpacity
            onPress={onGoToReview}
            style={styles.reviewPillBtn}
            accessibilityLabel={`Review ${pageCount} pages`}
          >
            <Text style={styles.reviewCount}>{pageCount}</Text>
            <Text style={styles.reviewLabel}>Done →</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  permissionCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    maxWidth: 380,
    width: '100%',
  },
  permIcon: {
    fontSize: 50,
    marginBottom: 12,
  },
  permTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  permSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  permBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  permBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  importBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  importBtnText: {
    fontWeight: '600',
    fontSize: 14,
  },
  closeTextBtn: {
    padding: 8,
  },
  closeText: {
    fontSize: 13,
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 14,
    fontSize: 14,
  },
  topBar: {
    position: 'absolute',
    top: 10,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  topRightRow: {
    flexDirection: 'row',
    gap: 12,
  },
  iconCircleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconActiveBtn: {
    backgroundColor: '#3B82F6',
    borderColor: '#60A5FA',
  },
  iconText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 10,
  },
  actionCircleBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
  },
  actionEmoji: {
    fontSize: 24,
  },
  actionLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  shutterOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterCapturing: {
    backgroundColor: '#3B82F6',
  },
  reviewPillBtn: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    width: 65,
  },
  reviewCount: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  reviewLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
});

export default ScannerCamera;
