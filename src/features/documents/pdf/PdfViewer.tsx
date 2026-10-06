import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  BackHandler,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppTheme } from '../../../shared/hooks';
import { DocumentItem } from '../../../shared/types';
import { DocumentRepository } from '../../../core/database/repositories/documentRepository';
import { FavoriteRepository } from '../../../core/database/repositories/favoriteRepository';
import { RecentRepository } from '../../../core/database/repositories/recentRepository';
import {
  PdfDocumentSession,
  PdfErrorType,
  PdfPageDimension,
} from './pdf.types';
import { pdfService } from './pdfService';
import { PdfToolbar } from './components/PdfToolbar';
import { PdfPageItem } from './components/PdfPageItem';
import { PdfJumpModal } from './components/PdfJumpModal';
import { PdfInfoModal } from './components/PdfInfoModal';
import {
  PdfZoomContainer,
  PdfZoomContainerHandle,
} from './components/PdfZoomContainer';
import {
  PdfAnnotation,
  AnnotationTool,
  PdfAnnotationToolbar,
  PdfNoteModal,
  PdfSaveAsModal,
  AnnotationService,
  AnnotationHistory,
} from './annotations';
import { EditorRouter } from '../../editor/services/editorRouter';

export interface PdfViewerProps {
  document: {
    id?: string;
    name?: string;
    uri: string;
    size?: number;
    mimeType?: string;
    path?: string;
    extension?: string;
    [key: string]: any;
  };
  onBack?: () => void;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  document,
  onBack: customOnBack,
}) => {
  const navigation = useNavigation<any>();
  const { themeColors, isDark } = useAppTheme();
  const { width: windowWidth } = useWindowDimensions();

  const [loading, setLoading] = useState<boolean>(true);
  const [session, setSession] = useState<PdfDocumentSession | null>(null);
  const [error, setError] = useState<{
    type: PdfErrorType;
    message: string;
  } | null>(null);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [isFavorite, setIsFavorite] = useState<boolean>(false);

  // Annotation states
  const [isAnnotating, setIsAnnotating] = useState<boolean>(false);
  const [activeTool, setActiveTool] = useState<AnnotationTool>('highlight');
  const [activeColor, setActiveColor] = useState<string>('#FACC15');
  const [annotations, setAnnotations] = useState<PdfAnnotation[]>([]);
  const historyRef = useRef<AnnotationHistory>(new AnnotationHistory());
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);

  // Modals
  const [activeNote, setActiveNote] = useState<PdfAnnotation | null>(null);
  const [showNoteModal, setShowNoteModal] = useState<boolean>(false);
  const [showSaveAsModal, setShowSaveAsModal] = useState<boolean>(false);
  const [isSavingAnnotatedPdf, setIsSavingAnnotatedPdf] = useState<boolean>(false);

  const [showJumpModal, setShowJumpModal] = useState<boolean>(false);
  const [showInfoModal, setShowInfoModal] = useState<boolean>(false);
  const [searchNotice, setSearchNotice] = useState<boolean>(false);

  const flatListRef = useRef<FlatList<PdfPageDimension>>(null);
  const zoomContainerRef = useRef<PdfZoomContainerHandle>(null);
  const sessionRef = useRef<PdfDocumentSession | null>(null);
  const activeDocIdRef = useRef<string>(document.id || '');

  const handleBack = useCallback(() => {
    if (customOnBack) {
      customOnBack();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [customOnBack, navigation]);

  // Android hardware back handler
  useEffect(() => {
    const onBackPress = () => {
      if (showSaveAsModal) {
        if (!isSavingAnnotatedPdf) {
          setShowSaveAsModal(false);
        }
        return true;
      }
      if (showNoteModal) {
        setShowNoteModal(false);
        return true;
      }
      if (isAnnotating) {
        setIsAnnotating(false);
        return true;
      }
      if (showJumpModal) {
        setShowJumpModal(false);
        return true;
      }
      if (showInfoModal) {
        setShowInfoModal(false);
        return true;
      }
      if (zoomScale > 1.05) {
        zoomContainerRef.current?.resetZoom();
        return true;
      }
      handleBack();
      return true;
    };

    const backSub = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress
    );
    return () => backSub.remove();
  }, [
    showSaveAsModal,
    showNoteModal,
    isAnnotating,
    isSavingAnnotatedPdf,
    showJumpModal,
    showInfoModal,
    zoomScale,
    handleBack,
  ]);

  // Load document session
  const loadDocument = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setCurrentPage(1);

      const docSession = await pdfService.openPdf(document.uri);
      sessionRef.current = docSession;
      setSession(docSession);
      setLoading(false);

      // Ensure document exists in DocumentRepository for persistent recents & favorites
      let docId = document.id;
      try {
        let existing = docId ? await DocumentRepository.findById(docId) : null;
        if (!existing && document.uri) {
          existing = await DocumentRepository.findByUri(document.uri);
          if (existing) {
            docId = existing.id;
          }
        }
        if (!existing && document.uri) {
          docId = docId || `doc_${Date.now()}`;
          const newDoc: DocumentItem = {
            id: docId,
            name: document.name || 'Document.pdf',
            uri: document.uri,
            path: document.path || document.uri,
            size: document.size || 0,
            mimeType: document.mimeType || 'application/pdf',
            extension: 'pdf',
            folderId: null,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            lastOpenedAt: Date.now(),
            isFavorite: false,
            isSecured: false,
          };
          await DocumentRepository.insert(newDoc);
        }
        if (docId) {
          activeDocIdRef.current = docId;
          RecentRepository.addRecent(docId).catch(() => {});
          const fav = await FavoriteRepository.isFavorite(docId);
          setIsFavorite(fav);

          // Restore saved annotations if available
          AnnotationService.loadAnnotations(docId)
            .then(loaded => {
              if (loaded && loaded.length > 0) {
                setAnnotations(loaded);
              }
            })
            .catch(() => {});
        }
      } catch {
        // ignore
      }
    } catch (err: any) {
      setLoading(false);
      setError({
        type: err.type || 'RENDER_ERROR',
        message: err.message || 'Failed to open PDF document',
      });
    }
  }, [document.uri, document.id]);

  useEffect(() => {
    loadDocument();

    return () => {
      if (sessionRef.current) {
        pdfService.closePdf(sessionRef.current.docId);
        sessionRef.current = null;
      }
    };
  }, [loadDocument]);

  // Compute page heights and layout offsets for instant jumping and smooth virtualization
  const contentWidth = Math.min(windowWidth - 24, 760);

  const layoutMetrics = useMemo(() => {
    if (!session || !session.pages.length) {
      return { heights: [], offsets: [] };
    }
    const heights: number[] = [];
    const offsets: number[] = [];
    let currentOffset = 0;

    for (let i = 0; i < session.pages.length; i++) {
      const page = session.pages[i];
      const pageHeight = Math.round(contentWidth / page.aspectRatio) + 16;
      heights.push(pageHeight);
      offsets.push(currentOffset);
      currentOffset += pageHeight;
    }

    return { heights, offsets };
  }, [session, contentWidth]);

  const getItemLayout = useCallback(
    (_: any, index: number) => {
      const length = layoutMetrics.heights[index] || 600;
      const offset = layoutMetrics.offsets[index] || index * 600;
      return { length, offset, index };
    },
    [layoutMetrics]
  );

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: any[] }) => {
      if (viewableItems && viewableItems.length > 0) {
        const first = viewableItems[0];
        if (first.index != null) {
          setCurrentPage(first.index + 1);
        }
      }
    }
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 45,
    minimumViewTime: 120,
  }).current;

  // Jump to specific page
  const handleJumpToPage = useCallback(
    (targetPage: number) => {
      setShowJumpModal(false);
      if (session && targetPage >= 1 && targetPage <= session.pageCount) {
        flatListRef.current?.scrollToIndex({
          index: targetPage - 1,
          animated: true,
        });
        setCurrentPage(targetPage);
      }
    },
    [session]
  );

  const handleScrollToIndexFailed = useCallback(
    (info: {
      index: number;
      highestMeasuredFrameIndex: number;
      averageItemLength: number;
    }) => {
      const targetOffset = layoutMetrics.offsets[info.index] ?? info.index * 600;
      flatListRef.current?.scrollToOffset({
        offset: targetOffset,
        animated: true,
      });
    },
    [layoutMetrics]
  );

  // Toggle favorite
  const handleToggleFavorite = useCallback(async () => {
    const docId = activeDocIdRef.current || document.id;
    if (!docId) return;
    try {
      const next = await FavoriteRepository.toggleFavorite(docId);
      setIsFavorite(next);
    } catch {
      // ignore
    }
  }, [document.id]);

  // Search press notice
  const handleSearchPress = useCallback(() => {
    setSearchNotice(true);
    setTimeout(() => {
      setSearchNotice(false);
    }, 2800);
  }, []);

  // Annotation handlers
  const handleAddAnnotation = useCallback((newAnnot: PdfAnnotation) => {
    historyRef.current.push({ type: 'ADD', annotation: newAnnot });
    setAnnotations(prev => {
      const next = [...prev, newAnnot];
      const docId = sessionRef.current?.docId || activeDocIdRef.current;
      if (docId) {
        AnnotationService.saveAnnotations(docId, next).catch(() => {});
      }
      return next;
    });
    setCanUndo(historyRef.current.canUndo());
    setCanRedo(historyRef.current.canRedo());
  }, []);

  const handleDeleteAnnotation = useCallback((annotId: string) => {
    setAnnotations(prev => {
      const target = prev.find(a => a.id === annotId);
      if (target) {
        historyRef.current.push({ type: 'DELETE', annotation: target });
        setCanUndo(historyRef.current.canUndo());
        setCanRedo(historyRef.current.canRedo());
        const next = prev.filter(a => a.id !== annotId);
        const docId = sessionRef.current?.docId || activeDocIdRef.current;
        if (docId) {
          AnnotationService.saveAnnotations(docId, next).catch(() => {});
        }
        return next;
      }
      return prev;
    });
  }, []);

  const handlePressNote = useCallback((annot: PdfAnnotation) => {
    setActiveNote(annot);
    setShowNoteModal(true);
  }, []);

  const handleSaveNoteText = useCallback((annotId: string, text: string) => {
    setAnnotations(prev => {
      const target = prev.find(a => a.id === annotId);
      if (target) {
        const updated = { ...target, text, updatedAt: Date.now() };
        historyRef.current.push({
          type: 'UPDATE',
          annotation: updated,
          previousAnnotation: target,
        });
        setCanUndo(historyRef.current.canUndo());
        setCanRedo(historyRef.current.canRedo());
        const next = prev.map(a => (a.id === annotId ? updated : a));
        const docId = sessionRef.current?.docId || activeDocIdRef.current;
        if (docId) {
          AnnotationService.saveAnnotations(docId, next).catch(() => {});
        }
        return next;
      }
      return prev;
    });
    setShowNoteModal(false);
  }, []);

  const handleUndo = useCallback(() => {
    setAnnotations(prev => {
      const { updated } = historyRef.current.undo(prev);
      const docId = sessionRef.current?.docId || activeDocIdRef.current;
      if (docId) {
        AnnotationService.saveAnnotations(docId, updated).catch(() => {});
      }
      return updated;
    });
    setCanUndo(historyRef.current.canUndo());
    setCanRedo(historyRef.current.canRedo());
  }, []);

  const handleRedo = useCallback(() => {
    setAnnotations(prev => {
      const { updated } = historyRef.current.redo(prev);
      const docId = sessionRef.current?.docId || activeDocIdRef.current;
      if (docId) {
        AnnotationService.saveAnnotations(docId, updated).catch(() => {});
      }
      return updated;
    });
    setCanUndo(historyRef.current.canUndo());
    setCanRedo(historyRef.current.canRedo());
  }, []);

  const handleSaveAs = useCallback(
    async (newFileName: string) => {
      try {
        setIsSavingAnnotatedPdf(true);
        const { documentItem } = await AnnotationService.exportAndSaveAnnotatedPdf(
          document.uri,
          annotations,
          newFileName
        );
        setIsSavingAnnotatedPdf(false);
        setShowSaveAsModal(false);
        setIsAnnotating(false);

        // Open newly flattened PDF directly with existing PDF viewer
        await EditorRouter.openDocument(navigation, documentItem);
      } catch (err: any) {
        setIsSavingAnnotatedPdf(false);
        Alert.alert(
          'Export Failed',
          err?.message || 'Unable to save the annotated PDF offline.'
        );
      }
    },
    [document.uri, annotations, navigation]
  );

  const renderPage = useCallback(
    ({ item }: { item: PdfPageDimension }) => {
      if (!session) return null;
      return (
        <PdfPageItem
          documentId={session.docId}
          page={item}
          containerWidth={contentWidth}
          isViewable={true}
          annotations={annotations}
          isAnnotating={isAnnotating}
          activeTool={activeTool}
          activeColor={activeColor}
          onAddAnnotation={handleAddAnnotation}
          onDeleteAnnotation={handleDeleteAnnotation}
          onPressNote={handlePressNote}
        />
      );
    },
    [
      session,
      contentWidth,
      annotations,
      isAnnotating,
      activeTool,
      activeColor,
      handleAddAnnotation,
      handleDeleteAnnotation,
      handlePressNote,
    ]
  );

  // Error views
  if (error) {
    const isPassword = error.type === 'PASSWORD_PROTECTED';
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: themeColors.background },
        ]}
      >
        <PdfToolbar
          title={document.name || 'PDF Document'}
          currentPage={0}
          pageCount={0}
          isFavorite={isFavorite}
          zoomScale={1.0}
          onBack={handleBack}
          onOpenJump={() => {}}
          onOpenInfo={() => setShowInfoModal(true)}
          onToggleFavorite={handleToggleFavorite}
          onSearchPress={handleSearchPress}
        />

        <View style={styles.centerContainer}>
          <View
            style={[
              styles.errorCard,
              {
                backgroundColor: themeColors.card,
                borderColor: themeColors.border,
              },
            ]}
          >
            <Text style={styles.errorIcon}>{isPassword ? '🔒' : '⚠️'}</Text>
            <Text
              style={[
                styles.errorTitle,
                { color: themeColors.textPrimary },
              ]}
            >
              {isPassword
                ? 'Password Protected PDF'
                : 'Unable to Render PDF'}
            </Text>
            <Text
              style={[
                styles.errorMessage,
                { color: themeColors.textSecondary },
              ]}
            >
              {isPassword
                ? 'This document is encrypted with a password. UniversalDocs offline viewer currently supports unprotected PDF files.'
                : error.message}
            </Text>

            <View style={styles.errorButtonRow}>
              {!isPassword && (
                <TouchableOpacity
                  style={[
                    styles.retryButton,
                    { backgroundColor: themeColors.primary },
                  ]}
                  onPress={loadDocument}
                  activeOpacity={0.8}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.closeButton,
                  {
                    backgroundColor: themeColors.cardSecondary,
                    borderColor: themeColors.border,
                  },
                ]}
                onPress={handleBack}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.closeButtonText,
                    { color: themeColors.textPrimary },
                  ]}
                >
                  Go Back
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <PdfInfoModal
          visible={showInfoModal}
          documentName={document.name || 'Document.pdf'}
          pageCount={0}
          fileSize={document.size}
          uri={document.uri}
          onClose={() => setShowInfoModal(false)}
        />
      </View>
    );
  }

  // Loading view
  if (loading) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: themeColors.background },
        ]}
      >
        <PdfToolbar
          title={document.name || 'PDF Document'}
          currentPage={1}
          pageCount={0}
          isFavorite={isFavorite}
          zoomScale={1.0}
          onBack={handleBack}
          onOpenJump={() => {}}
          onOpenInfo={() => {}}
          onToggleFavorite={handleToggleFavorite}
          onSearchPress={handleSearchPress}
        />

        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text
            style={[
              styles.loadingTitle,
              { color: themeColors.textPrimary },
            ]}
          >
            Opening Document
          </Text>
          <Text
            style={[
              styles.loadingSubtitle,
              { color: themeColors.textSecondary },
            ]}
          >
            Rendering vector PDF pages offline...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: themeColors.background },
      ]}
    >
      {/* Top Toolbar / Annotation Toolbar */}
      {isAnnotating ? (
        <PdfAnnotationToolbar
          activeTool={activeTool}
          activeColor={activeColor}
          canUndo={canUndo}
          canRedo={canRedo}
          onSelectTool={setActiveTool}
          onSelectColor={setActiveColor}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onSaveAs={() => setShowSaveAsModal(true)}
          onClose={() => setIsAnnotating(false)}
        />
      ) : (
        <PdfToolbar
          title={document.name || 'PDF Document'}
          currentPage={currentPage}
          pageCount={session ? session.pageCount : 0}
          isFavorite={isFavorite}
          zoomScale={zoomScale}
          onBack={handleBack}
          onOpenJump={() => setShowJumpModal(true)}
          onOpenInfo={() => setShowInfoModal(true)}
          onToggleFavorite={handleToggleFavorite}
          onSearchPress={handleSearchPress}
          onAnnotatePress={() => setIsAnnotating(true)}
          onZoomReset={() => zoomContainerRef.current?.resetZoom()}
        />
      )}

      {/* Optional Search Notice Banner */}
      {searchNotice && (
        <View
          style={[
            styles.noticeBanner,
            {
              backgroundColor: isDark ? '#1E293B' : '#FEF3C7',
              borderColor: isDark ? '#334155' : '#FDE68A',
            },
          ]}
        >
          <Text
            style={[
              styles.noticeText,
              { color: isDark ? '#F1F5F9' : '#92400E' },
            ]}
          >
            ℹ️ Text search will be enabled in the next milestone.
          </Text>
        </View>
      )}

      {/* Main Document Scroll View inside Zoom Container */}
      <PdfZoomContainer
        ref={zoomContainerRef}
        minScale={1.0}
        maxScale={3.5}
        enabled={!isAnnotating}
        onScaleChange={setZoomScale}
      >
        <FlatList
          ref={flatListRef}
          data={session ? session.pages : []}
          keyExtractor={item => `page_${item.pageIndex}`}
          renderItem={renderPage}
          getItemLayout={getItemLayout}
          onScrollToIndexFailed={handleScrollToIndexFailed}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          contentContainerStyle={styles.listContent}
          initialNumToRender={3}
          maxToRenderPerBatch={4}
          windowSize={7}
          removeClippedSubviews={true}
          showsVerticalScrollIndicator={true}
        />
      </PdfZoomContainer>

      {/* Modals */}
      <PdfJumpModal
        visible={showJumpModal}
        currentPage={currentPage}
        pageCount={session ? session.pageCount : 1}
        onJump={handleJumpToPage}
        onClose={() => setShowJumpModal(false)}
      />

      <PdfInfoModal
        visible={showInfoModal}
        documentName={document.name || 'Document.pdf'}
        pageCount={session ? session.pageCount : 0}
        fileSize={document.size}
        uri={document.uri}
        onClose={() => setShowInfoModal(false)}
      />

      <PdfNoteModal
        visible={showNoteModal}
        annotation={activeNote}
        onSaveText={handleSaveNoteText}
        onDeleteNote={handleDeleteAnnotation}
        onClose={() => setShowNoteModal(false)}
      />

      <PdfSaveAsModal
        visible={showSaveAsModal}
        defaultFileName={document.name || 'Document.pdf'}
        annotationCount={annotations.length}
        pageCount={session ? session.pageCount : 1}
        isSaving={isSavingAnnotatedPdf}
        onSave={handleSaveAs}
        onClose={() => setShowSaveAsModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 16,
  },
  loadingSubtitle: {
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },
  listContent: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  noticeBanner: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  noticeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  errorCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
    elevation: 4,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  errorButtonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  closeButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
  },
  closeButtonText: {
    fontWeight: '700',
    fontSize: 14,
  },
});

export default PdfViewer;
