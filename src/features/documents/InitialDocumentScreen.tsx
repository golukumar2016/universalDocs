import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { pick, types } from '@react-native-documents/picker';
import { incomingFileService } from '../../core/intents/incomingFileService';
import { ResolvedDocument } from '../../core/documents/documentResolver';
import { formatFileSize } from '../../shared/utils';

export const InitialDocumentScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  const [resolvedDoc, setResolvedDoc] = useState<ResolvedDocument | null>(null);
  const [isPicking, setIsPicking] = useState<boolean>(false);

  // Subscribe to incoming file service
  useEffect(() => {
    // Check initial document and subscribe to subsequent ones
    const unsubscribe = incomingFileService.subscribe((doc) => {
      if (!doc) return;

      if (!doc.isSupported) {
        // Route directly to UnsupportedDocumentScreen for unsupported files
        navigation.navigate('UnsupportedDocument', {
          document: doc.document,
          reason: `UniversalDocs does not support the .${doc.document.extension} format yet.`,
        });
      } else {
        setResolvedDoc(doc);
      }
    });

    // Check if initial document exists
    const current = incomingFileService.getCurrentDocument();
    if (current) {
      if (!current.isSupported) {
        navigation.navigate('UnsupportedDocument', {
          document: current.document,
          reason: `UniversalDocs does not support the .${current.document.extension} format yet.`,
        });
      } else {
        setResolvedDoc(current);
      }
    }

    return () => {
      unsubscribe();
    };
  }, [navigation]);

  // Handle manual "Open a document" picker
  const handlePickDocument = async () => {
    try {
      setIsPicking(true);
      const results = await pick({
        type: [types.allFiles],
        mode: 'open',
      });

      if (results && results.length > 0) {
        const file = results[0];
        const doc = await incomingFileService.resolveUri(
          file.uri,
          file.name ?? undefined,
          file.type ?? undefined
        );

        if (!doc.isSupported) {
          navigation.navigate('UnsupportedDocument', {
            document: doc.document,
            reason: `UniversalDocs does not support the .${doc.document.extension} format yet.`,
          });
        } else {
          setResolvedDoc(doc);
        }
      }
    } catch (error: any) {
      // User cancelled picker or error
      if (error?.message && !error.message.includes('cancelled') && !error.message.includes('canceled')) {
        Alert.alert('Error', 'Could not open document.');
      }
    } finally {
      setIsPicking(false);
    }
  };

  // Handle pressing [ Open ] for the external file
  const handleOpenDocument = () => {
    if (!resolvedDoc) return;

    // Navigate to DocumentViewer (e.g. PDF document screen, etc.)
    navigation.navigate('DocumentViewer', {
      document: resolvedDoc.document,
    });
  };

  const handleClearSelection = () => {
    incomingFileService.clearCurrentDocument();
    setResolvedDoc(null);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* App Title Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>UniversalDocs</Text>
          <Text style={styles.headerSubtitle}>Offline Document Manager</Text>
        </View>

        {/* State 1: An external file is loaded */}
        {resolvedDoc ? (
          <View style={styles.card}>
            <View style={styles.iconWrapper}>
              <Text style={styles.documentEmoji}>📄</Text>
            </View>

            <Text style={styles.documentName} numberOfLines={2}>
              {resolvedDoc.document.name}
            </Text>

            <View style={styles.metaBox}>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Type:</Text>
                <Text style={styles.metaValue}>
                  {resolvedDoc.fileTypeInfo.type}
                </Text>
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>MIME Type:</Text>
                <Text style={styles.metaValueSub} numberOfLines={1}>
                  {resolvedDoc.document.mimeType}
                </Text>
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Location:</Text>
                <Text style={styles.metaValue}>External file</Text>
              </View>

              {resolvedDoc.document.size !== undefined && (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Size:</Text>
                  <Text style={styles.metaValue}>
                    {formatFileSize(resolvedDoc.document.size)}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.openButton}
                onPress={handleOpenDocument}
                activeOpacity={0.8}
              >
                <Text style={styles.openButtonText}>[ Open ]</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.clearButton}
                onPress={handleClearSelection}
                activeOpacity={0.7}
              >
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* State 2: No document selected */
          <View style={styles.card}>
            <View style={styles.iconWrapper}>
              <Text style={styles.documentEmoji}>📄</Text>
            </View>

            <Text style={styles.emptyTitle}>No document selected</Text>

            <Text style={styles.emptyHint}>
              Select a document from your file manager with "Open with UniversalDocs", or choose one below.
            </Text>

            <TouchableOpacity
              style={styles.openDocumentButton}
              onPress={handlePickDocument}
              disabled={isPicking}
              activeOpacity={0.8}
            >
              {isPicking ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.openDocumentButtonText}>Open a document</Text>
              )}
            </TouchableOpacity>

            <View style={styles.formatsFooter}>
              <Text style={styles.formatsLabel}>Supported Formats:</Text>
              <Text style={styles.formatsList}>
                PDF • TXT • CSV • DOC • DOCX • XLS • XLSX • PPT • PPTX
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  documentEmoji: {
    fontSize: 40,
  },
  documentName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F8FAFC',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  metaBox: {
    width: '100%',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  metaLabel: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
  },
  metaValue: {
    fontSize: 14,
    color: '#38BDF8',
    fontWeight: '700',
  },
  metaValueSub: {
    fontSize: 13,
    color: '#CBD5E1',
    maxWidth: '65%',
    textAlign: 'right',
  },
  actionButtons: {
    width: '100%',
    flexDirection: 'column',
    gap: 10,
  },
  openButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
  },
  openButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  clearButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '500',
  },
  openDocumentButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  openDocumentButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  formatsFooter: {
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 16,
    width: '100%',
  },
  formatsLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  formatsList: {
    fontSize: 12,
    color: '#38BDF8',
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default InitialDocumentScreen;
