import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  KeyboardAvoidingView,
  ScrollView,
  BackHandler,
  Modal,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { DocumentItem, Document } from '../../../../shared/types';
import { formatFileSize, formatDate } from '../../../../shared/utils';
import { useAppTheme } from '../../../../shared/hooks';
import { TxtService } from './txtService';

export interface TXTEditorProps {
  documentId?: string;
  filePath?: string;
  title?: string;
  document?: Document | DocumentItem;
}

export const TXTEditor: React.FC<TXTEditorProps> = (props) => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { themeColors, isDark } = useAppTheme();

  const initialDoc = props.document || route.params?.document;
  const initialFilePath = props.filePath || route.params?.filePath;
  const initialDocumentId = props.documentId || route.params?.documentId;
  const initialTitle = props.title || route.params?.title || initialDoc?.name;

  const [document, setDocument] = useState<DocumentItem | null>(null);
  const [content, setContent] = useState<string>('');
  const [initialContent, setInitialContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isInfoModalVisible, setIsInfoModalVisible] = useState<boolean>(false);
  const [isSaveAsModalVisible, setIsSaveAsModalVisible] = useState<boolean>(false);
  const [saveAsFileName, setSaveAsFileName] = useState<string>('');

  const isDirty = content !== initialContent;
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;

  const contentRef = useRef(content);
  contentRef.current = content;

  const documentRef = useRef(document);
  documentRef.current = document;

  // Load document on mount
  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        setIsLoading(true);
        const target = initialDoc || initialFilePath || initialDocumentId;
        if (!target) {
          throw new Error('No document provided to editor.');
        }

        const result = await TxtService.loadDocument(target);
        if (isMounted) {
          setDocument(result.document);
          setContent(result.content);
          setInitialContent(result.content);
          setSaveAsFileName(result.document.name || 'document.txt');
        }
      } catch (err: any) {
        if (isMounted) {
          Alert.alert('Unable to Open', err?.message || 'Could not load text document.', [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [initialDoc, initialFilePath, initialDocumentId, navigation]);

  // Save handler
  const handleSave = useCallback(async (): Promise<boolean> => {
    const currentDoc = documentRef.current;
    if (!currentDoc) return false;

    try {
      setIsSaving(true);
      const updated = await TxtService.saveDocument(currentDoc, contentRef.current);
      setDocument(updated);
      setInitialContent(contentRef.current);
      setStatusMessage('Saved locally');
      setTimeout(() => setStatusMessage(''), 2500);
      return true;
    } catch (error: any) {
      Alert.alert(
        'Save Error',
        error?.message || 'Unable to save changes. Your original document has not been replaced.'
      );
      return false;
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Save As handler
  const handleSaveAsSubmit = useCallback(async () => {
    const trimmed = saveAsFileName.trim();
    if (!trimmed) {
      Alert.alert('Validation Error', 'Please enter a valid file name.');
      return;
    }

    try {
      setIsSaving(true);
      const newDoc = await TxtService.saveDocumentAs(
        documentRef.current,
        trimmed,
        contentRef.current
      );
      setDocument(newDoc);
      setInitialContent(contentRef.current);
      setIsSaveAsModalVisible(false);
      setStatusMessage('Saved as new file');
      setTimeout(() => setStatusMessage(''), 2500);
    } catch (error: any) {
      Alert.alert('Save As Error', error?.message || 'Failed to save new file.');
    } finally {
      setIsSaving(false);
    }
  }, [saveAsFileName]);

  // Request leave confirmation when dirty
  const promptUnsavedChanges = useCallback(
    (onDiscard: () => void) => {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes in this document.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: onDiscard,
          },
          {
            text: 'Save',
            onPress: async () => {
              const success = await handleSave();
              if (success) {
                onDiscard();
              }
            },
          },
        ]
      );
    },
    [handleSave]
  );

  // Close handler
  const handleClose = useCallback(() => {
    if (isDirtyRef.current) {
      promptUnsavedChanges(() => navigation.goBack());
    } else {
      navigation.goBack();
    }
  }, [navigation, promptUnsavedChanges]);

  // Intercept Android hardware back button
  useEffect(() => {
    const onBackPress = () => {
      if (isDirtyRef.current) {
        promptUnsavedChanges(() => navigation.goBack());
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [navigation, promptUnsavedChanges]);

  // Stats calculation
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const lineCount = content.split('\n').length;
  const charCount = content.length;

  if (isLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color={themeColors.primary} />
        <Text style={[styles.loadingText, { color: themeColors.textSecondary }]}>
          Loading document...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Editor Toolbar */}
        <View
          style={[
            styles.toolbar,
            {
              backgroundColor: themeColors.surface,
              borderBottomColor: themeColors.border,
            },
          ]}
        >
          <TouchableOpacity
            onPress={handleClose}
            style={styles.toolbarBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={[styles.toolbarBtnText, { color: themeColors.primary }]}>←</Text>
          </TouchableOpacity>

          <View style={styles.titleContainer}>
            <Text
              style={[styles.documentTitle, { color: themeColors.textPrimary }]}
              numberOfLines={1}
            >
              {document?.name || initialTitle || 'Document.txt'}
            </Text>
            <View style={styles.statusRow}>
              {isDirty ? (
                <Text style={[styles.statusText, { color: themeColors.warning }]}>
                  ● Unsaved changes
                </Text>
              ) : (
                <Text style={[styles.statusText, { color: themeColors.textMuted }]}>
                  {statusMessage || 'Offline • Ready'}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.actionsGroup}>
            <TouchableOpacity
              onPress={() => setIsInfoModalVisible(true)}
              style={[
                styles.iconBtn,
                { backgroundColor: themeColors.cardSecondary, borderColor: themeColors.border },
              ]}
              hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
            >
              <Text style={styles.iconBtnEmoji}>ℹ️</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setSaveAsFileName(document?.name || 'document.txt');
                setIsSaveAsModalVisible(true);
              }}
              style={[
                styles.iconBtn,
                { backgroundColor: themeColors.cardSecondary, borderColor: themeColors.border },
              ]}
              hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
            >
              <Text style={styles.iconBtnEmoji}>💾+</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSave}
              disabled={!isDirty || isSaving}
              style={[
                styles.saveButton,
                isDirty
                  ? { backgroundColor: themeColors.primary }
                  : {
                      backgroundColor: themeColors.cardSecondary,
                      borderWidth: 1,
                      borderColor: themeColors.border,
                    },
              ]}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text
                  style={[
                    styles.saveButtonText,
                    { color: isDirty ? '#FFFFFF' : themeColors.textMuted },
                  ]}
                >
                  Save
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Text Input Editor Canvas */}
        <ScrollView
          style={[styles.editorScroll, { backgroundColor: themeColors.background }]}
          contentContainerStyle={styles.editorScrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <TextInput
            style={[
              styles.textInput,
              {
                color: themeColors.textPrimary,
                fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
              },
            ]}
            value={content}
            onChangeText={setContent}
            placeholder="Type your notes or document text here..."
            placeholderTextColor={themeColors.textMuted}
            multiline={true}
            scrollEnabled={false}
            textAlignVertical="top"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </ScrollView>

        {/* Status & Stats Footer */}
        <View
          style={[
            styles.footer,
            {
              backgroundColor: themeColors.surface,
              borderTopColor: themeColors.border,
            },
          ]}
        >
          <Text style={[styles.footerText, { color: themeColors.textMuted }]}>
            {lineCount} lines • {wordCount} words • {charCount} chars
          </Text>
          <Text style={[styles.footerText, { color: themeColors.textMuted }]}>
            {formatFileSize(charCount)}
          </Text>
        </View>

        {/* Save As Modal */}
        <Modal
          visible={isSaveAsModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsSaveAsModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalCard,
                { backgroundColor: themeColors.card, borderColor: themeColors.border },
              ]}
            >
              <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>
                Save As New Document
              </Text>
              <Text style={[styles.modalSubtitle, { color: themeColors.textSecondary }]}>
                Enter a file name for the new offline copy:
              </Text>

              <TextInput
                style={[
                  styles.modalInput,
                  {
                    color: themeColors.textPrimary,
                    borderColor: themeColors.border,
                    backgroundColor: themeColors.cardSecondary,
                  },
                ]}
                value={saveAsFileName}
                onChangeText={setSaveAsFileName}
                placeholder="My Notes.txt"
                placeholderTextColor={themeColors.textMuted}
                autoFocus={true}
                selectTextOnFocus={true}
              />

              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={[styles.modalBtn, { borderColor: themeColors.border, borderWidth: 1 }]}
                  onPress={() => setIsSaveAsModalVisible(false)}
                >
                  <Text style={[styles.modalBtnText, { color: themeColors.textSecondary }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: themeColors.primary }]}
                  onPress={handleSaveAsSubmit}
                >
                  <Text style={[styles.modalBtnText, { color: '#FFFFFF', fontWeight: '700' }]}>
                    Save
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Document Info Modal */}
        <Modal
          visible={isInfoModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsInfoModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalCard,
                { backgroundColor: themeColors.card, borderColor: themeColors.border },
              ]}
            >
              <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>
                Document Information
              </Text>

              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: themeColors.textSecondary }]}>Name:</Text>
                <Text style={[styles.infoVal, { color: themeColors.textPrimary }]}>
                  {document?.name || 'Untitled'}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: themeColors.textSecondary }]}>Format:</Text>
                <Text style={[styles.infoVal, { color: themeColors.textPrimary }]}>
                  Plain Text (.txt)
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: themeColors.textSecondary }]}>Size:</Text>
                <Text style={[styles.infoVal, { color: themeColors.textPrimary }]}>
                  {formatFileSize(charCount)}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: themeColors.textSecondary }]}>
                  Statistics:
                </Text>
                <Text style={[styles.infoVal, { color: themeColors.textPrimary }]}>
                  {lineCount} lines • {wordCount} words
                </Text>
              </View>

              {document?.updatedAt ? (
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: themeColors.textSecondary }]}>
                    Modified:
                  </Text>
                  <Text style={[styles.infoVal, { color: themeColors.textPrimary }]}>
                    {formatDate(document.updatedAt)}
                  </Text>
                </View>
              ) : null}

              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: themeColors.textSecondary }]}>URI:</Text>
                <Text
                  style={[styles.infoVal, { color: themeColors.textSecondary, fontSize: 11 }]}
                  numberOfLines={2}
                >
                  {document?.uri || 'Local storage'}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  { backgroundColor: themeColors.primary, marginTop: 18, width: '100%' },
                ]}
                onPress={() => setIsInfoModalVisible(false)}
              >
                <Text style={[styles.modalBtnText, { color: '#FFFFFF', fontWeight: '700' }]}>
                  Done
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '500',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  toolbarBtn: {
    padding: 6,
  },
  toolbarBtnText: {
    fontSize: 22,
    fontWeight: '700',
  },
  titleContainer: {
    flex: 1,
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnEmoji: {
    fontSize: 16,
  },
  saveButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 58,
  },
  saveButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  editorScroll: {
    flex: 1,
  },
  editorScrollContent: {
    padding: 16,
    minHeight: '100%',
  },
  textInput: {
    fontSize: 15,
    lineHeight: 22,
    padding: 0,
    margin: 0,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  footerText: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 20,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnText: {
    fontSize: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#33415533',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  infoVal: {
    fontSize: 13,
    fontWeight: '500',
    maxWidth: '65%',
    textAlign: 'right',
  },
});

export default TXTEditor;
