import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  BackHandler,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppTheme } from '../../shared/hooks';
import { DocumentItem } from '../../shared/types';
import { EditorRouter } from '../editor/services/editorRouter';
import {
  ScannerStep,
  ScanPage,
  ScannerSession,
  ScanDocumentCorners,
  CropTransformResult,
  EnhancementMode,
} from './types/scanner.types';
import { ScannerService } from './services/scannerService';
import { ScannerCamera } from './components/ScannerCamera';
import { CropEditor } from './components/CropEditor';
import { EnhancementSelector } from './components/EnhancementSelector';
import { ScanReview } from './components/ScanReview';
import { SavePdfModal } from './components/SavePdfModal';

export const ScannerScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { themeColors } = useAppTheme();

  const [step, setStep] = useState<ScannerStep>('CAMERA_CAPTURE');
  const [session, setSession] = useState<ScannerSession>(() =>
    ScannerService.createSession()
  );

  // Active page being cropped / enhanced
  const [activePhoto, setActivePhoto] = useState<{
    uri: string;
    width: number;
    height: number;
    initialCorners?: ScanDocumentCorners;
  } | null>(null);

  const [activeCropResult, setActiveCropResult] = useState<CropTransformResult | null>(null);
  const [activeCorners, setActiveCorners] = useState<ScanDocumentCorners | null>(null);

  const [isSaveModalOpen, setIsSaveModalOpen] = useState<boolean>(false);

  const sessionRef = useRef(session);
  sessionRef.current = session;

  const stepRef = useRef(step);
  stepRef.current = step;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      ScannerService.cleanupTemporaryImages().catch(() => {});
    };
  }, []);

  // Hardware Back Handler
  useEffect(() => {
    const handleBack = () => {
      const currentStep = stepRef.current;
      const currentSession = sessionRef.current;

      if (isSaveModalOpen) {
        setIsSaveModalOpen(false);
        return true;
      }

      if (currentStep === 'ENHANCE') {
        setStep('CROP');
        return true;
      }

      if (currentStep === 'CROP') {
        if (currentSession.pages.length > 0) {
          setStep('REVIEW');
        } else {
          setStep('CAMERA_CAPTURE');
        }
        return true;
      }

      if (currentStep === 'CAMERA_CAPTURE' && currentSession.pages.length > 0) {
        setStep('REVIEW');
        return true;
      }

      if (currentSession.pages.length > 0) {
        Alert.alert(
          'Discard Scanned Document?',
          `You have ${currentSession.pages.length} scanned ${
            currentSession.pages.length === 1 ? 'page' : 'pages'
          }. Discarding will delete this scan session.`,
          [
            { text: 'Keep Scanning', style: 'cancel' },
            {
              text: 'Discard',
              style: 'destructive',
              onPress: () => {
                ScannerService.cleanupTemporaryImages().catch(() => {});
                setSession(ScannerService.createSession());
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  navigation.navigate('MainTabs');
                }
              },
            },
          ]
        );
        return true;
      }

      if (navigation.canGoBack()) {
        navigation.goBack();
        return true;
      }

      return false;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', handleBack);
    return () => sub.remove();
  }, [navigation, isSaveModalOpen]);

  // Step 1: Photo Captured from Camera or Imported
  const handlePhotoCaptured = async (
    imagePath: string,
    width: number,
    height: number
  ) => {
    try {
      // Run automatic edge detection for initial corner placement
      let initialCorners: ScanDocumentCorners | undefined;
      try {
        const edgeResult = await ScannerService.detectDocumentEdges(imagePath);
        if (edgeResult && edgeResult.corners) {
          initialCorners = edgeResult.corners;
          if (edgeResult.width > 0 && edgeResult.height > 0) {
            width = edgeResult.width;
            height = edgeResult.height;
          }
        }
      } catch {
        // Fallback to default margins
      }

      setActivePhoto({
        uri: imagePath,
        width,
        height,
        initialCorners,
      });
      setStep('CROP');
    } catch (err: any) {
      Alert.alert('Image Error', err?.message || 'Could not load captured image.');
    }
  };

  // Step 2: Confirm 4-Corner Perspective Crop
  const handleConfirmCrop = (
    result: CropTransformResult,
    corners: ScanDocumentCorners
  ) => {
    setActiveCropResult(result);
    setActiveCorners(corners);
    setStep('ENHANCE');
  };

  // Step 3: Confirm Enhancement & Add Page to Session
  const handleConfirmPage = (
    enhancedImagePath: string,
    mode: EnhancementMode
  ) => {
    if (!activePhoto || !activeCropResult) return;

    const newPage: ScanPage = {
      id: `page_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      originalImagePath: activePhoto.uri,
      croppedImagePath: activeCropResult.imagePath,
      enhancedImagePath,
      corners: activeCorners || {
        topLeft: { x: 0, y: 0 },
        topRight: { x: activePhoto.width, y: 0 },
        bottomRight: { x: activePhoto.width, y: activePhoto.height },
        bottomLeft: { x: 0, y: activePhoto.height },
      },
      enhancementMode: mode,
      rotation: 0,
      width: activeCropResult.width,
      height: activeCropResult.height,
      timestamp: Date.now(),
    };

    setSession(prev => ScannerService.addPage(prev, newPage));
    setActivePhoto(null);
    setActiveCropResult(null);
    setActiveCorners(null);
    setStep('REVIEW');
  };

  // Re-crop existing page
  const handleEditPage = (page: ScanPage) => {
    setActivePhoto({
      uri: page.originalImagePath,
      width: page.width,
      height: page.height,
      initialCorners: page.corners,
    });
    setStep('CROP');
  };

  // Delete page
  const handleDeletePage = (pageId: string) => {
    setSession(prev => {
      const next = ScannerService.removePage(prev, pageId);
      if (next.pages.length === 0) {
        setStep('CAMERA_CAPTURE');
      }
      return next;
    });
  };

  // Move page up/down
  const handleMovePage = (pageId: string, direction: 'UP' | 'DOWN') => {
    setSession(prev => ScannerService.movePage(prev, pageId, direction));
  };

  // Discard all pages
  const handleDiscardScan = () => {
    ScannerService.cleanupTemporaryImages().catch(() => {});
    setSession(ScannerService.createSession());
    setStep('CAMERA_CAPTURE');
  };

  // PDF Saved & Generated Callback
  const handlePdfSaved = async (document: DocumentItem) => {
    setIsSaveModalOpen(false);
    // Reset scanner session state
    setSession(ScannerService.createSession());
    setStep('CAMERA_CAPTURE');

    // Open through UniversalDocs EditorRouter into existing PDF Viewer Engine!
    await EditorRouter.openDocument(navigation, document);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      {step === 'CAMERA_CAPTURE' && (
        <ScannerCamera
          pageCount={session.pages.length}
          onPhotoCaptured={handlePhotoCaptured}
          onGoToReview={() => setStep('REVIEW')}
          onClose={() => {
            if (session.pages.length > 0) {
              setStep('REVIEW');
            } else if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('MainTabs');
            }
          }}
        />
      )}

      {step === 'CROP' && activePhoto && (
        <CropEditor
          imageUri={activePhoto.uri}
          originalWidth={activePhoto.width}
          originalHeight={activePhoto.height}
          initialCorners={activePhoto.initialCorners}
          onRetake={() => {
            setActivePhoto(null);
            if (session.pages.length > 0) {
              setStep('REVIEW');
            } else {
              setStep('CAMERA_CAPTURE');
            }
          }}
          onConfirmCrop={handleConfirmCrop}
        />
      )}

      {step === 'ENHANCE' && activeCropResult && (
        <EnhancementSelector
          croppedImagePath={activeCropResult.imagePath}
          onBackToCrop={() => setStep('CROP')}
          onConfirmPage={handleConfirmPage}
        />
      )}

      {step === 'REVIEW' && (
        <ScanReview
          pages={session.pages}
          onAddPage={() => setStep('CAMERA_CAPTURE')}
          onDeletePage={handleDeletePage}
          onMovePage={handleMovePage}
          onEditPage={handleEditPage}
          onGeneratePdf={() => setIsSaveModalOpen(true)}
          onDiscardScan={handleDiscardScan}
        />
      )}

      {/* Save PDF Modal */}
      <SavePdfModal
        visible={isSaveModalOpen}
        pages={session.pages}
        onClose={() => setIsSaveModalOpen(false)}
        onSuccess={handlePdfSaved}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default ScannerScreen;
