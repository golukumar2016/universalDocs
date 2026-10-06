/**
 * UniversalDocs - PDF Annotation Layer
 * High-performance interactive overlay mounted on each PDF page.
 * Handles touch gestures for highlight, underline, strikethrough, freehand ink, sticky notes, and eraser.
 */

import React, { useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
  TouchableOpacity,
} from 'react-native';
import {
  PdfAnnotation,
  AnnotationTool,
  NormalizedPoint,
} from '../annotation.types';
import { AnnotationService } from '../annotationService';

export interface PdfAnnotationLayerProps {
  documentId: string;
  pageIndex: number;
  pageWidth: number;
  pageHeight: number;
  annotations: PdfAnnotation[];
  isAnnotating: boolean;
  activeTool: AnnotationTool;
  activeColor: string;
  onAddAnnotation: (annotation: PdfAnnotation) => void;
  onDeleteAnnotation: (annotationId: string) => void;
  onPressNote: (annotation: PdfAnnotation) => void;
}

interface DragRect {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export const PdfAnnotationLayer: React.FC<PdfAnnotationLayerProps> = ({
  documentId,
  pageIndex,
  pageWidth,
  pageHeight,
  annotations,
  isAnnotating,
  activeTool,
  activeColor,
  onAddAnnotation,
  onDeleteAnnotation,
  onPressNote,
}) => {
  // Active in-progress drawing states
  const [activeDragRect, setActiveDragRect] = useState<DragRect | null>(null);
  const [activeInkPoints, setActiveInkPoints] = useState<{ x: number; y: number }[]>([]);

  // Filter annotations for this specific page
  const pageAnnotations = useMemo(() => {
    return annotations.filter(a => a.pageIndex === pageIndex);
  }, [annotations, pageIndex]);

  // Check collision for eraser tool
  const checkEraserCollision = (px: number, py: number) => {
    for (const annot of pageAnnotations) {
      if (annot.type === 'note') {
        const pt = annot.bounds
          ? AnnotationService.denormalizePoint({ x: annot.bounds.x, y: annot.bounds.y }, pageWidth, pageHeight)
          : { x: 0, y: 0 };
        const dist = Math.hypot(pt.x - px, pt.y - py);
        if (dist <= 24) {
          onDeleteAnnotation(annot.id);
          return;
        }
      } else if (annot.type === 'ink' && annot.points) {
        for (const np of annot.points) {
          const pt = AnnotationService.denormalizePoint(np, pageWidth, pageHeight);
          if (Math.hypot(pt.x - px, pt.y - py) <= 16) {
            onDeleteAnnotation(annot.id);
            return;
          }
        }
      } else if (annot.bounds) {
        const rect = AnnotationService.denormalizeRect(annot.bounds, pageWidth, pageHeight);
        const pad = 8;
        if (
          px >= rect.x - pad &&
          px <= rect.x + rect.width + pad &&
          py >= rect.y - pad &&
          py <= rect.y + rect.height + pad
        ) {
          onDeleteAnnotation(annot.id);
          return;
        }
      }
    }
  };

  // PanResponder to handle drawing & tapping when in annotation mode
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isAnnotating && activeTool !== 'select',
      onMoveShouldSetPanResponder: () => isAnnotating && activeTool !== 'select',

      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;

        if (activeTool === 'eraser') {
          checkEraserCollision(locationX, locationY);
          return;
        }

        if (activeTool === 'note') {
          const normPt = AnnotationService.normalizePoint(
            locationX,
            locationY,
            pageWidth,
            pageHeight
          );
          const newNote = AnnotationService.createNote(
            documentId,
            pageIndex,
            normPt,
            '',
            activeColor
          );
          onAddAnnotation(newNote);
          onPressNote(newNote);
          return;
        }

        if (activeTool === 'ink') {
          setActiveInkPoints([{ x: locationX, y: locationY }]);
          return;
        }

        if (
          activeTool === 'highlight' ||
          activeTool === 'underline' ||
          activeTool === 'strikethrough'
        ) {
          setActiveDragRect({
            startX: locationX,
            startY: locationY,
            currentX: locationX,
            currentY: locationY,
          });
        }
      },

      onPanResponderMove: (
        evt: GestureResponderEvent,
        gestureState: PanResponderGestureState
      ) => {
        const { locationX, locationY } = evt.nativeEvent;

        if (activeTool === 'eraser') {
          checkEraserCollision(locationX, locationY);
          return;
        }

        if (activeTool === 'ink') {
          setActiveInkPoints(prev => [...prev, { x: locationX, y: locationY }]);
          return;
        }

        if (
          activeTool === 'highlight' ||
          activeTool === 'underline' ||
          activeTool === 'strikethrough'
        ) {
          setActiveDragRect(prev =>
            prev ? { ...prev, currentX: locationX, currentY: locationY } : null
          );
        }
      },

      onPanResponderRelease: () => {
        if (activeTool === 'ink') {
          if (activeInkPoints.length > 0) {
            const normalizedPoints: NormalizedPoint[] = activeInkPoints.map(p =>
              AnnotationService.normalizePoint(p.x, p.y, pageWidth, pageHeight)
            );
            const inkAnnot = AnnotationService.createInk(
              documentId,
              pageIndex,
              normalizedPoints,
              activeColor,
              3.0
            );
            onAddAnnotation(inkAnnot);
          }
          setActiveInkPoints([]);
          return;
        }

        if (
          (activeTool === 'highlight' ||
            activeTool === 'underline' ||
            activeTool === 'strikethrough') &&
          activeDragRect
        ) {
          const width = activeDragRect.currentX - activeDragRect.startX;
          const height = activeDragRect.currentY - activeDragRect.startY;

          // Only create if there was real drag gesture (minimum 6px width or height)
          if (Math.abs(width) >= 6 || Math.abs(height) >= 6) {
            const normRect = AnnotationService.normalizeRect(
              activeDragRect.startX,
              activeDragRect.startY,
              width,
              height,
              pageWidth,
              pageHeight
            );

            if (activeTool === 'highlight') {
              onAddAnnotation(
                AnnotationService.createHighlight(
                  documentId,
                  pageIndex,
                  normRect,
                  activeColor
                )
              );
            } else if (activeTool === 'underline') {
              onAddAnnotation(
                AnnotationService.createUnderline(
                  documentId,
                  pageIndex,
                  normRect,
                  activeColor
                )
              );
            } else if (activeTool === 'strikethrough') {
              onAddAnnotation(
                AnnotationService.createStrikethrough(
                  documentId,
                  pageIndex,
                  normRect,
                  activeColor
                )
              );
            }
          }
          setActiveDragRect(null);
        }
      },

      onPanResponderTerminate: () => {
        setActiveDragRect(null);
        setActiveInkPoints([]);
      },
    })
  ).current;

  // Helper to render ink vector segments using native RN Views
  const renderInkStroke = (
    points: { x: number; y: number }[],
    color: string,
    strokeWidth: number = 3
  ) => {
    if (!points || points.length === 0) return null;
    if (points.length === 1) {
      const p = points[0];
      return (
        <View
          key="dot_0"
          style={{
            position: 'absolute',
            left: p.x - strokeWidth / 2,
            top: p.y - strokeWidth / 2,
            width: strokeWidth,
            height: strokeWidth,
            borderRadius: strokeWidth / 2,
            backgroundColor: color,
          }}
        />
      );
    }

    const segments: React.ReactNode[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 0.5) continue;

      const angle = Math.atan2(dy, dx);
      const cx = (p1.x + p2.x) / 2;
      const cy = (p1.y + p2.y) / 2;

      segments.push(
        <View
          key={`seg_${i}`}
          style={{
            position: 'absolute',
            left: cx - dist / 2,
            top: cy - strokeWidth / 2,
            width: dist,
            height: strokeWidth,
            borderRadius: strokeWidth / 2,
            backgroundColor: color,
            transform: [{ rotate: `${angle}rad` }],
          }}
        />
      );
    }
    return segments;
  };

  return (
    <View
      style={[
        styles.overlayContainer,
        { width: pageWidth, height: pageHeight },
      ]}
      pointerEvents={isAnnotating ? 'auto' : 'box-none'}
      {...(isAnnotating ? panResponder.panHandlers : {})}
    >
      {/* 1. Render all committed annotations */}
      {pageAnnotations.map(annot => {
        if (annot.type === 'highlight' && annot.bounds) {
          const r = AnnotationService.denormalizeRect(
            annot.bounds,
            pageWidth,
            pageHeight
          );
          return (
            <View
              key={annot.id}
              style={[
                styles.highlight,
                {
                  left: r.x,
                  top: r.y,
                  width: r.width,
                  height: r.height,
                  backgroundColor: annot.style.color,
                  opacity: annot.style.opacity ?? 0.38,
                },
              ]}
            />
          );
        }

        if (annot.type === 'underline' && annot.bounds) {
          const r = AnnotationService.denormalizeRect(
            annot.bounds,
            pageWidth,
            pageHeight
          );
          const sw = annot.style.strokeWidth ?? 2.5;
          return (
            <View
              key={annot.id}
              style={[
                styles.underline,
                {
                  left: r.x,
                  top: Math.max(0, r.y + r.height - sw),
                  width: r.width,
                  height: sw,
                  backgroundColor: annot.style.color,
                },
              ]}
            />
          );
        }

        if (annot.type === 'strikethrough' && annot.bounds) {
          const r = AnnotationService.denormalizeRect(
            annot.bounds,
            pageWidth,
            pageHeight
          );
          const sw = annot.style.strokeWidth ?? 2.0;
          return (
            <View
              key={annot.id}
              style={[
                styles.strikethrough,
                {
                  left: r.x,
                  top: Math.max(0, r.y + r.height / 2 - sw / 2),
                  width: r.width,
                  height: sw,
                  backgroundColor: annot.style.color,
                },
              ]}
            />
          );
        }

        if (annot.type === 'ink' && annot.points) {
          const denormPoints = annot.points.map(pt =>
            AnnotationService.denormalizePoint(pt, pageWidth, pageHeight)
          );
          return (
            <React.Fragment key={annot.id}>
              {renderInkStroke(
                denormPoints,
                annot.style.color,
                annot.style.strokeWidth ?? 3.0
              )}
            </React.Fragment>
          );
        }

        if (annot.type === 'note' && annot.bounds) {
          const pt = AnnotationService.denormalizePoint(
            { x: annot.bounds.x, y: annot.bounds.y },
            pageWidth,
            pageHeight
          );
          return (
            <TouchableOpacity
              key={annot.id}
              style={[
                styles.noteBadge,
                {
                  left: Math.max(0, pt.x - 14),
                  top: Math.max(0, pt.y - 14),
                  backgroundColor: annot.style.color || '#F59E0B',
                },
              ]}
              onPress={() => onPressNote(annot)}
              activeOpacity={0.8}
            >
              <Text style={styles.noteEmoji}>📝</Text>
            </TouchableOpacity>
          );
        }

        return null;
      })}

      {/* 2. Live preview for in-progress drag selection */}
      {activeDragRect && (
        <View
          style={[
            styles.dragPreview,
            {
              left: Math.min(activeDragRect.startX, activeDragRect.currentX),
              top: Math.min(activeDragRect.startY, activeDragRect.currentY),
              width: Math.abs(activeDragRect.currentX - activeDragRect.startX),
              height: Math.abs(activeDragRect.currentY - activeDragRect.startY),
              backgroundColor:
                activeTool === 'highlight' ? activeColor : 'rgba(59, 130, 246, 0.15)',
              opacity: activeTool === 'highlight' ? 0.38 : 0.8,
              borderColor: activeColor,
              borderStyle: activeTool === 'highlight' ? 'solid' : 'dashed',
            },
          ]}
        />
      )}

      {/* 3. Live preview for in-progress ink stroke */}
      {activeInkPoints.length > 0 &&
        renderInkStroke(activeInkPoints, activeColor, 3.0)}
    </View>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'hidden',
  },
  highlight: {
    position: 'absolute',
    borderRadius: 2,
  },
  underline: {
    position: 'absolute',
    borderRadius: 1,
  },
  strikethrough: {
    position: 'absolute',
    borderRadius: 1,
  },
  dragPreview: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: 2,
  },
  noteBadge: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  noteEmoji: {
    fontSize: 14,
  },
});

export default PdfAnnotationLayer;
