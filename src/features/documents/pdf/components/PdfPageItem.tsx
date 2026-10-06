import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
  PixelRatio,
  TouchableOpacity,
} from 'react-native';
import { PdfPageDimension } from '../pdf.types';
import { PdfService } from '../pdfService';
import {
  PdfAnnotation,
  AnnotationTool,
  PdfAnnotationLayer,
} from '../annotations';

export interface PdfPageItemProps {
  documentId: string;
  page: PdfPageDimension;
  containerWidth: number;
  isViewable: boolean;
  annotations?: PdfAnnotation[];
  isAnnotating?: boolean;
  activeTool?: AnnotationTool;
  activeColor?: string;
  onAddAnnotation?: (annotation: PdfAnnotation) => void;
  onDeleteAnnotation?: (annotationId: string) => void;
  onPressNote?: (annotation: PdfAnnotation) => void;
}

export const PdfPageItem: React.FC<PdfPageItemProps> = React.memo(
  ({
    documentId,
    page,
    containerWidth,
    isViewable,
    annotations = [],
    isAnnotating = false,
    activeTool = 'select',
    activeColor = '#FACC15',
    onAddAnnotation,
    onDeleteAnnotation,
    onPressNote,
  }) => {
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [hasError, setHasError] = useState<boolean>(false);
    const hasRequestedRef = useRef<boolean>(false);

    // Calculate exact proportional height based on page aspect ratio
    const pageHeight =
      page.aspectRatio > 0 ? containerWidth / page.aspectRatio : containerWidth * 1.414;

    const renderWidthPx = Math.round(containerWidth * Math.min(PixelRatio.get(), 2.5));

    const loadPageImage = async () => {
      try {
        setIsLoading(true);
        setHasError(false);
        const uri = await PdfService.renderPage(
          documentId,
          page.pageIndex,
          renderWidthPx,
          0
        );
        setImageUri(uri);
      } catch (err) {
        console.warn(`PdfPageItem: Failed to render page ${page.pageNumber}:`, err);
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    };

    useEffect(() => {
      // Trigger render when the page becomes viewable or nearby
      if ((isViewable || !hasRequestedRef.current) && !imageUri && !isLoading && !hasError) {
        if (isViewable) {
          hasRequestedRef.current = true;
          loadPageImage();
        }
      }
    }, [isViewable, imageUri, isLoading, hasError]);

    return (
      <View
        style={[
          styles.pageCard,
          {
            width: containerWidth,
            height: pageHeight,
          },
        ]}
      >
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={{ width: containerWidth, height: pageHeight }}
            resizeMode="contain"
          />
        ) : hasError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorText}>
              Page {page.pageNumber} could not be rendered
            </Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={loadPageImage}
              activeOpacity={0.7}
            >
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.placeholderContainer}>
            <ActivityIndicator size="small" color="#3B82F6" />
            <Text style={styles.placeholderText}>
              Rendering page {page.pageNumber}...
            </Text>
          </View>
        )}

        {/* Interactive Annotation Layer */}
        <PdfAnnotationLayer
          documentId={documentId}
          pageIndex={page.pageIndex}
          pageWidth={containerWidth}
          pageHeight={pageHeight}
          annotations={annotations}
          isAnnotating={isAnnotating}
          activeTool={activeTool}
          activeColor={activeColor}
          onAddAnnotation={onAddAnnotation || (() => {})}
          onDeleteAnnotation={onDeleteAnnotation || (() => {})}
          onPressNote={onPressNote || (() => {})}
        />

        {/* Subtle Page Number Badge */}
        <View style={styles.pageBadge}>
          <Text style={styles.pageBadgeText}>{page.pageNumber}</Text>
        </View>
      </View>
    );
  },
  (prev, next) => {
    return (
      prev.documentId === next.documentId &&
      prev.page.pageIndex === next.page.pageIndex &&
      prev.containerWidth === next.containerWidth &&
      prev.isViewable === next.isViewable &&
      prev.isAnnotating === next.isAnnotating &&
      prev.activeTool === next.activeTool &&
      prev.activeColor === next.activeColor &&
      prev.annotations === next.annotations
    );
  }
);

const styles = StyleSheet.create({
  pageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    marginVertical: 6,
    alignSelf: 'center',
    overflow: 'hidden',
    position: 'relative',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  placeholderContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  placeholderText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 6,
  },
  errorIcon: {
    fontSize: 24,
  },
  errorText: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '600',
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 6,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#EF4444',
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  pageBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pageBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});

export default PdfPageItem;
