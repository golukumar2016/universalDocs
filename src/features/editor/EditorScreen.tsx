import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../app/navigation/navigation.types';
import { DocumentRepository } from '../../core/database/repositories/documentRepository';
import { DocumentService } from '../../core/filesystem/documentService';
import { DocumentItem } from '../../shared/types';
import { formatFileSize } from '../../shared/utils';
import { colors } from '../../shared/theme';

type EditorScreenRouteProp = RouteProp<RootStackParamList, 'Editor'>;

export const EditorScreen: React.FC = () => {
  const route = useRoute<EditorScreenRouteProp>();
  const navigation = useNavigation();

  const { documentId } = route.params || {};

  const [document, setDocument] = useState<DocumentItem | null>(null);
  const [content, setContent] = useState<string>('');
  const [initialContent, setInitialContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const hasUnsavedChanges = content !== initialContent;

  // Load document and its content
  useEffect(() => {
    let isMounted = true;

    async function loadDoc() {
      if (!documentId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const doc = await DocumentRepository.findById(documentId);
        if (!doc) {
          Alert.alert('Error', 'Document not found.');
          navigation.goBack();
          return;
        }

        if (isMounted) {
          setDocument(doc);
        }

        const text = await DocumentService.loadContent(doc.path, doc.extension);
        if (isMounted) {
          setContent(text);
          setInitialContent(text);
        }
      } catch (error: any) {
        Alert.alert('Load Failed', error?.message || 'Unable to read file.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadDoc();

    return () => {
      isMounted = false;
    };
  }, [documentId, navigation]);

  // Save changes locally
  const handleSave = useCallback(async () => {
    if (!document) return;

    try {
      setIsSaving(true);
      const updatedDoc = await DocumentService.saveContent(document, content);
      setDocument(updatedDoc);
      setInitialContent(content);
      setStatusMessage('Saved locally');

      setTimeout(() => {
        setStatusMessage('');
      }, 2500);
    } catch (error: any) {
      Alert.alert('Save Error', error?.message || 'Could not save changes.');
    } finally {
      setIsSaving(false);
    }
  }, [document, content]);

  // Back handler with unsaved confirmation
  const handleBack = useCallback(() => {
    if (hasUnsavedChanges) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Do you want to save before leaving?',
        [
          { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
          {
            text: 'Save & Exit',
            onPress: async () => {
              await handleSave();
              navigation.goBack();
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } else {
      navigation.goBack();
    }
  }, [hasUnsavedChanges, navigation, handleSave]);

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const lineCount = content.split('\n').length;
  const charCount = content.length;

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading document...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Custom Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>← Close</Text>
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {document?.name || 'Document'}
            </Text>
            <Text style={styles.headerSub}>
              {hasUnsavedChanges ? '● Unsaved' : statusMessage || 'Offline - Ready'}
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleSave}
            disabled={!hasUnsavedChanges || isSaving}
            style={[
              styles.saveBtn,
              hasUnsavedChanges ? styles.saveBtnActive : styles.saveBtnDisabled,
            ]}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveBtnText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Info Toolbar */}
        <View style={styles.toolbar}>
          <Text style={styles.toolbarInfo}>
            {lineCount} {lineCount === 1 ? 'line' : 'lines'}
          </Text>
          <Text style={styles.toolbarDivider}>|</Text>
          <Text style={styles.toolbarInfo}>{wordCount} words</Text>
          <Text style={styles.toolbarDivider}>|</Text>
          <Text style={styles.toolbarInfo}>{charCount} chars</Text>
          {document && (
            <>
              <Text style={styles.toolbarDivider}>|</Text>
              <Text style={styles.toolbarInfo}>{formatFileSize(document.size)}</Text>
            </>
          )}
        </View>

        {/* Document Editor Area */}
        <ScrollView style={styles.editorScroll} keyboardShouldPersistTaps="handled">
          <TextInput
            style={styles.editorInput}
            multiline
            value={content}
            onChangeText={setContent}
            placeholder="Type your document content here..."
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
            autoCorrect={false}
            textAlignVertical="top"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardContainer: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: '#FFFFFF',
  },
  headerBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  headerBtnText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  headerSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  saveBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  saveBtnActive: {
    backgroundColor: colors.primary,
  },
  saveBtnDisabled: {
    backgroundColor: '#E2E8F0',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  toolbarInfo: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  toolbarDivider: {
    marginHorizontal: 8,
    color: colors.border,
    fontSize: 12,
  },
  editorScroll: {
    flex: 1,
  },
  editorInput: {
    flex: 1,
    padding: 16,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
    fontFamily: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'monospace',
    }),
    minHeight: 400,
  },
});

export default EditorScreen;
