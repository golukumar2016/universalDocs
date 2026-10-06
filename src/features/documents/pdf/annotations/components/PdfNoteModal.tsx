/**
 * UniversalDocs - PDF Sticky Note Modal
 * Modal for creating, reading, and editing sticky note text on PDF pages.
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAppTheme } from '../../../../../shared/hooks';
import { PdfAnnotation } from '../annotation.types';

export interface PdfNoteModalProps {
  visible: boolean;
  annotation: PdfAnnotation | null;
  onSaveText: (annotationId: string, text: string) => void;
  onDeleteNote: (annotationId: string) => void;
  onClose: () => void;
}

export const PdfNoteModal: React.FC<PdfNoteModalProps> = ({
  visible,
  annotation,
  onSaveText,
  onDeleteNote,
  onClose,
}) => {
  const { themeColors, isDark } = useAppTheme();
  const [text, setText] = useState<string>('');

  useEffect(() => {
    if (annotation) {
      setText(annotation.text || '');
    } else {
      setText('');
    }
  }, [annotation]);

  if (!annotation) return null;

  const handleSave = () => {
    onSaveText(annotation.id, text.trim());
    onClose();
  };

  const handleDelete = () => {
    onDeleteNote(annotation.id);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={[
                styles.modalCard,
                {
                  backgroundColor: themeColors.card,
                  borderColor: themeColors.border,
                },
              ]}
            >
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <Text style={styles.noteEmoji}>📝</Text>
                  <Text style={[styles.title, { color: themeColors.textPrimary }]}>
                    Sticky Note (Page {annotation.pageIndex + 1})
                  </Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Text style={[styles.closeIcon, { color: themeColors.textMuted }]}>
                    ✕
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Text Input */}
              <TextInput
                style={[
                  styles.textInput,
                  {
                    color: themeColors.textPrimary,
                    backgroundColor: isDark ? '#1E293B' : '#FEF3C7',
                    borderColor: isDark ? '#334155' : '#FDE68A',
                  },
                ]}
                placeholder="Type your note here..."
                placeholderTextColor={themeColors.textMuted}
                multiline
                numberOfLines={5}
                value={text}
                onChangeText={setText}
                autoFocus
              />

              {/* Footer Actions */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  onPress={handleDelete}
                  style={[styles.deleteBtn, { borderColor: '#EF4444' }]}
                  activeOpacity={0.7}
                >
                  <Text style={styles.deleteBtnText}>🗑️ Delete</Text>
                </TouchableOpacity>

                <View style={styles.rightButtons}>
                  <TouchableOpacity
                    onPress={onClose}
                    style={[styles.cancelBtn, { borderColor: themeColors.border }]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.cancelBtnText, { color: themeColors.textSecondary }]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleSave}
                    style={[styles.saveBtn, { backgroundColor: themeColors.primary }]}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.saveBtnText}>Save Note</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noteEmoji: {
    fontSize: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  closeIcon: {
    fontSize: 18,
    fontWeight: '600',
  },
  textInput: {
    height: 120,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
    lineHeight: 20,
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deleteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  deleteBtnText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
  },
  rightButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
