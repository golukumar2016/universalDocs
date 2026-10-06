import React, { useState, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  PanResponder,
  ActivityIndicator,
  PanResponderInstance,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../../shared/hooks';
import {
  ScanCornerPoint,
  ScanDocumentCorners,
  CropTransformResult,
} from '../types/scanner.types';
import { ScannerService } from '../services/scannerService';

export interface CropEditorProps {
  imageUri: string;
  originalWidth: number;
  originalHeight: number;
  initialCorners?: ScanDocumentCorners;
  onRetake: () => void;
  onConfirmCrop: (result: CropTransformResult, corners: ScanDocumentCorners) => void;
}

const HANDLE_SIZE = 36;

export const CropEditor: React.FC<CropEditorProps> = ({
  imageUri,
  originalWidth,
  originalHeight,
  initialCorners,
  onRetake,
  onConfirmCrop,
}) => {
  const insets = useSafeAreaInsets();
  const { themeColors, isDark } = useAppTheme();
  const screen = Dimensions.get('window');

  const containerWidth = screen.width;
  const [containerHeight, setContainerHeight] = useState(screen.height * 0.65);

  // Calculate scaled image frame within container
  const imgAspect = originalWidth > 0 && originalHeight > 0
    ? originalWidth / originalHeight
    : 3 / 4;

  const { displayWidth, displayHeight, offsetX, offsetY } = useMemo(() => {
    let dw = containerWidth;
    let dh = containerWidth / imgAspect;

    if (dh > containerHeight) {
      dh = containerHeight;
      dw = containerHeight * imgAspect;
    }

    const ox = (containerWidth - dw) / 2;
    const oy = (containerHeight - dh) / 2;

    return { displayWidth: dw, displayHeight: dh, offsetX: ox, offsetY: oy };
  }, [containerWidth, containerHeight, imgAspect]);

  // Normalized corners [0..1]
  const [corners, setCorners] = useState<{
    topLeft: ScanCornerPoint;
    topRight: ScanCornerPoint;
    bottomRight: ScanCornerPoint;
    bottomLeft: ScanCornerPoint;
  }>(() => {
    if (initialCorners && originalWidth > 0 && originalHeight > 0) {
      return {
        topLeft: {
          x: Math.min(1, Math.max(0, initialCorners.topLeft.x / originalWidth)),
          y: Math.min(1, Math.max(0, initialCorners.topLeft.y / originalHeight)),
        },
        topRight: {
          x: Math.min(1, Math.max(0, initialCorners.topRight.x / originalWidth)),
          y: Math.min(1, Math.max(0, initialCorners.topRight.y / originalHeight)),
        },
        bottomRight: {
          x: Math.min(1, Math.max(0, initialCorners.bottomRight.x / originalWidth)),
          y: Math.min(1, Math.max(0, initialCorners.bottomRight.y / originalHeight)),
        },
        bottomLeft: {
          x: Math.min(1, Math.max(0, initialCorners.bottomLeft.x / originalWidth)),
          y: Math.min(1, Math.max(0, initialCorners.bottomLeft.y / originalHeight)),
        },
      };
    }
    return {
      topLeft: { x: 0.06, y: 0.06 },
      topRight: { x: 0.94, y: 0.06 },
      bottomRight: { x: 0.94, y: 0.94 },
      bottomLeft: { x: 0.06, y: 0.94 },
    };
  });

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [currentImageUri, setCurrentImageUri] = useState<string>(imageUri);
  const [currentRotation, setCurrentRotation] = useState<number>(0);

  const cornersRef = useRef(corners);
  cornersRef.current = corners;

  // PanResponder creator for each corner handle
  const createHandleResponder = (cornerKey: keyof typeof corners): PanResponderInstance => {
    let startX = 0;
    let startY = 0;

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startX = cornersRef.current[cornerKey].x;
        startY = cornersRef.current[cornerKey].y;
      },
      onPanResponderMove: (_, gestureState) => {
        const deltaNormX = gestureState.dx / displayWidth;
        const deltaNormY = gestureState.dy / displayHeight;

        const newX = Math.max(0.01, Math.min(0.99, startX + deltaNormX));
        const newY = Math.max(0.01, Math.min(0.99, startY + deltaNormY));

        setCorners(prev => ({
          ...prev,
          [cornerKey]: { x: newX, y: newY },
        }));
      },
    });
  };

  const panTL = useRef(createHandleResponder('topLeft')).current;
  const panTR = useRef(createHandleResponder('topRight')).current;
  const panBR = useRef(createHandleResponder('bottomRight')).current;
  const panBL = useRef(createHandleResponder('bottomLeft')).current;

  // Convert normalized corner to screen pixel coordinates
  const getScreenPos = useCallback(
    (point: ScanCornerPoint) => ({
      x: offsetX + point.x * displayWidth,
      y: offsetY + point.y * displayHeight,
    }),
    [offsetX, offsetY, displayWidth, displayHeight]
  );

  const posTL = getScreenPos(corners.topLeft);
  const posTR = getScreenPos(corners.topRight);
  const posBR = getScreenPos(corners.bottomRight);
  const posBL = getScreenPos(corners.bottomLeft);

  // Line drawing helper between two points
  const renderLine = (p1: { x: number; y: number }, p2: { x: number; y: number }, key: string) => {
    const length = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
    const cx = (p1.x + p2.x) / 2;
    const cy = (p1.y + p2.y) / 2;

    return (
      <View
        key={key}
        style={[
          styles.cropLine,
          {
            width: length,
            left: cx - length / 2,
            top: cy - 1,
            transform: [{ rotate: `${angle}deg` }],
          },
        ]}
      />
    );
  };

  const handleResetCorners = () => {
    setCorners({
      topLeft: { x: 0.06, y: 0.06 },
      topRight: { x: 0.94, y: 0.06 },
      bottomRight: { x: 0.94, y: 0.94 },
      bottomLeft: { x: 0.06, y: 0.94 },
    });
  };

  const handleRotate = async () => {
    try {
      setIsProcessing(true);
      const nextRot = (currentRotation + 90) % 360;
      setCurrentRotation(nextRot);
      const rotatedPath = await ScannerService.rotateImage(currentImageUri, 90);
      setCurrentImageUri(rotatedPath);
      handleResetCorners();
    } catch (err) {
      console.warn('Rotate failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmCrop = async () => {
    try {
      setIsProcessing(true);

      // Denormalize corners to actual image pixel coordinates
      const pixelCorners: ScanDocumentCorners = {
        topLeft: {
          x: Math.round(corners.topLeft.x * originalWidth),
          y: Math.round(corners.topLeft.y * originalHeight),
        },
        topRight: {
          x: Math.round(corners.topRight.x * originalWidth),
          y: Math.round(corners.topRight.y * originalHeight),
        },
        bottomRight: {
          x: Math.round(corners.bottomRight.x * originalWidth),
          y: Math.round(corners.bottomRight.y * originalHeight),
        },
        bottomLeft: {
          x: Math.round(corners.bottomLeft.x * originalWidth),
          y: Math.round(corners.bottomLeft.y * originalHeight),
        },
      };

      const result = await ScannerService.cropAndPerspectiveTransform(
        currentImageUri,
        pixelCorners
      );

      onConfirmCrop(result, pixelCorners);
    } catch (err) {
      console.warn('Perspective crop failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: '#111827' }]}>
      {/* Top Header / Actions */}
      <View
        style={[
          styles.topToolbar,
          {
            paddingTop: Math.max(insets.top, 20) + 4,
          },
        ]}
      >
        <TouchableOpacity
          onPress={onRetake}
          style={styles.toolBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.toolBtnText}>← Retake</Text>
        </TouchableOpacity>

        <View style={styles.topRightTools}>
          <TouchableOpacity
            onPress={handleRotate}
            style={styles.toolBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.toolBtnText}>🔄 Rotate</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleResetCorners}
            style={styles.toolBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.toolBtnText}>↺ Reset</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Image Area with Draggable Corners */}
      <View
        style={[styles.imageContainer, { flex: 1 }]}
        onLayout={e => {
          const h = e.nativeEvent.layout.height;
          if (h > 0 && Math.abs(h - containerHeight) > 10) {
            setContainerHeight(h);
          }
        }}
      >
        <Image
          source={{ uri: currentImageUri }}
          style={[
            styles.image,
            {
              width: displayWidth,
              height: displayHeight,
              left: offsetX,
              top: offsetY,
            },
          ]}
          resizeMode="contain"
        />

        {/* Boundary Lines between the 4 corners */}
        {renderLine(posTL, posTR, 'line_top')}
        {renderLine(posTR, posBR, 'line_right')}
        {renderLine(posBR, posBL, 'line_bottom')}
        {renderLine(posBL, posTL, 'line_left')}

        {/* Four Draggable Corner Handles */}
        <View
          style={[
            styles.cornerHandle,
            {
              left: posTL.x - HANDLE_SIZE / 2,
              top: posTL.y - HANDLE_SIZE / 2,
            },
          ]}
          {...panTL.panHandlers}
        >
          <View style={styles.cornerDot} />
        </View>

        <View
          style={[
            styles.cornerHandle,
            {
              left: posTR.x - HANDLE_SIZE / 2,
              top: posTR.y - HANDLE_SIZE / 2,
            },
          ]}
          {...panTR.panHandlers}
        >
          <View style={styles.cornerDot} />
        </View>

        <View
          style={[
            styles.cornerHandle,
            {
              left: posBR.x - HANDLE_SIZE / 2,
              top: posBR.y - HANDLE_SIZE / 2,
            },
          ]}
          {...panBR.panHandlers}
        >
          <View style={styles.cornerDot} />
        </View>

        <View
          style={[
            styles.cornerHandle,
            {
              left: posBL.x - HANDLE_SIZE / 2,
              top: posBL.y - HANDLE_SIZE / 2,
            },
          ]}
          {...panBL.panHandlers}
        >
          <View style={styles.cornerDot} />
        </View>

        {isProcessing && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>Applying perspective crop...</Text>
          </View>
        )}
      </View>

      {/* Bottom Confirmation Bar */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: themeColors.surface,
            paddingBottom: Math.max(insets.bottom, 16) + 12,
          },
        ]}
      >
        <Text style={[styles.hintText, { color: themeColors.textSecondary }]}>
          Drag 4 corners to fit document borders
        </Text>

        <TouchableOpacity
          style={[styles.confirmBtn, { backgroundColor: themeColors.primary }]}
          onPress={handleConfirmCrop}
          disabled={isProcessing}
          activeOpacity={0.8}
        >
          <Text style={styles.confirmBtnText}>Next: Enhance →</Text>
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
    paddingTop: 12,
    paddingBottom: 8,
  },
  topRightTools: {
    flexDirection: 'row',
    gap: 12,
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
  imageContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  image: {
    position: 'absolute',
  },
  cropLine: {
    position: 'absolute',
    height: 2.5,
    backgroundColor: '#3B82F6',
    zIndex: 10,
  },
  cornerHandle: {
    position: 'absolute',
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_SIZE / 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 2.5,
    borderColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  cornerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563EB',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    alignItems: 'center',
    gap: 10,
  },
  hintText: {
    fontSize: 13,
    fontWeight: '500',
  },
  confirmBtn: {
    width: '100%',
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

export default CropEditor;
