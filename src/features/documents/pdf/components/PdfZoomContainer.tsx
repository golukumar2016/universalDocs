import React, {
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from 'react';
import {
  View,
  StyleSheet,
  PanResponder,
  Animated,
  PanResponderInstance,
} from 'react-native';

export interface PdfZoomContainerHandle {
  resetZoom: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  getScale: () => number;
}

export interface PdfZoomContainerProps {
  children: React.ReactNode;
  minScale?: number;
  maxScale?: number;
  enabled?: boolean;
  onScaleChange?: (scale: number) => void;
  onDoubleTap?: () => void;
}

export const PdfZoomContainer = forwardRef<
  PdfZoomContainerHandle,
  PdfZoomContainerProps
>(({ children, minScale = 1.0, maxScale = 3.5, enabled = true, onScaleChange, onDoubleTap }, ref) => {
  const scale = useRef(new Animated.Value(1.0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const currentScale = useRef(1.0);
  const currentTranslateX = useRef(0);
  const currentTranslateY = useRef(0);

  const initialDistance = useRef(0);
  const startScale = useRef(1.0);
  const lastTapTime = useRef(0);

  const updateScale = useCallback(
    (newScale: number) => {
      const clamped = Math.max(minScale, Math.min(maxScale, newScale));
      currentScale.current = clamped;
      scale.setValue(clamped);
      if (onScaleChange) {
        onScaleChange(clamped);
      }
    },
    [minScale, maxScale, onScaleChange, scale]
  );

  const resetZoom = useCallback(() => {
    currentScale.current = 1.0;
    currentTranslateX.current = 0;
    currentTranslateY.current = 0;

    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1.0,
        useNativeDriver: true,
        friction: 7,
      }),
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        friction: 7,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        friction: 7,
      }),
    ]).start(() => {
      if (onScaleChange) {
        onScaleChange(1.0);
      }
    });
  }, [scale, translateX, translateY, onScaleChange]);

  const zoomIn = useCallback(() => {
    const nextScale = Math.min(maxScale, currentScale.current + 0.5);
    Animated.spring(scale, {
      toValue: nextScale,
      useNativeDriver: true,
      friction: 7,
    }).start(() => {
      currentScale.current = nextScale;
      onScaleChange?.(nextScale);
    });
  }, [maxScale, scale, onScaleChange]);

  const zoomOut = useCallback(() => {
    const nextScale = Math.max(minScale, currentScale.current - 0.5);
    if (nextScale <= 1.0) {
      resetZoom();
    } else {
      Animated.spring(scale, {
        toValue: nextScale,
        useNativeDriver: true,
        friction: 7,
      }).start(() => {
        currentScale.current = nextScale;
        onScaleChange?.(nextScale);
      });
    }
  }, [minScale, resetZoom, scale, onScaleChange]);

  useImperativeHandle(
    ref,
    () => ({
      resetZoom,
      zoomIn,
      zoomOut,
      getScale: () => currentScale.current,
    }),
    [resetZoom, zoomIn, zoomOut]
  );

  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const panResponder = useRef<PanResponderInstance>(
    PanResponder.create({
      onStartShouldSetPanResponder: evt => {
        if (!enabledRef.current) return false;
        return evt.nativeEvent.touches.length === 2;
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        if (!enabledRef.current) return false;
        // Only take over if pinching (2 touches) or already zoomed in and moving
        if (evt.nativeEvent.touches.length === 2) {
          return true;
        }
        if (
          currentScale.current > 1.05 &&
          (Math.abs(gestureState.dx) > 6 || Math.abs(gestureState.dy) > 6)
        ) {
          return true;
        }
        return false;
      },
      onPanResponderGrant: evt => {
        const touches = evt.nativeEvent.touches;
        if (touches.length === 2) {
          const dx = touches[0].pageX - touches[1].pageX;
          const dy = touches[0].pageY - touches[1].pageY;
          initialDistance.current = Math.hypot(dx, dy);
          startScale.current = currentScale.current;
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length === 2) {
          // Pinch
          const dx = touches[0].pageX - touches[1].pageX;
          const dy = touches[0].pageY - touches[1].pageY;
          const distance = Math.hypot(dx, dy);

          if (initialDistance.current > 0) {
            const ratio = distance / initialDistance.current;
            const targetScale = startScale.current * ratio;
            updateScale(targetScale);
          }
        } else if (touches.length === 1 && currentScale.current > 1.05) {
          // Pan when zoomed
          const maxPanX = 180 * (currentScale.current - 1);
          const maxPanY = 300 * (currentScale.current - 1);

          const nextX = Math.max(
            -maxPanX,
            Math.min(maxPanX, currentTranslateX.current + gestureState.dx)
          );
          const nextY = Math.max(
            -maxPanY,
            Math.min(maxPanY, currentTranslateY.current + gestureState.dy)
          );

          translateX.setValue(nextX);
          translateY.setValue(nextY);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        const now = Date.now();
        if (now - lastTapTime.current < 300) {
          // Double tap detected
          lastTapTime.current = 0;
          if (currentScale.current > 1.1) {
            resetZoom();
          } else {
            Animated.spring(scale, {
              toValue: 2.0,
              useNativeDriver: true,
              friction: 7,
            }).start(() => {
              currentScale.current = 2.0;
              onScaleChange?.(2.0);
            });
          }
          onDoubleTap?.();
          return;
        }
        lastTapTime.current = now;

        if (currentScale.current <= 1.05) {
          resetZoom();
        } else {
          currentTranslateX.current = Math.max(
            -180 * (currentScale.current - 1),
            Math.min(
              180 * (currentScale.current - 1),
              currentTranslateX.current + gestureState.dx
            )
          );
          currentTranslateY.current = Math.max(
            -300 * (currentScale.current - 1),
            Math.min(
              300 * (currentScale.current - 1),
              currentTranslateY.current + gestureState.dy
            )
          );
        }
      },
    })
  ).current;

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <Animated.View
        style={[
          styles.content,
          {
            transform: [
              { translateX },
              { translateY },
              { scale },
            ],
          },
        ]}
      >
        {children}
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
  },
});

export default PdfZoomContainer;
