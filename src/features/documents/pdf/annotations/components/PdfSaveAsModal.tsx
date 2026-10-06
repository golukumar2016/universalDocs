/**
 * UniversalDocs - PDF Save As Modal
 * Export dialog for flattening annotations into a new offline PDF.
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
  ActivityIndicator,
} from 'react-native';
import { useAppTheme } from '../../../../../shared/hooks';

export interface PdfSaveAsModalProps {
  visible: boolean;
  defaultFileName: string;
  annotationCount: number;
  pageCount: number;
  isSaving: boolean;
  onSave: (fileName: string) => void;
  onClose: () => void;
}

export const PdfSaveAsModal: React.FC<PdfSaveAsModalProps> = ({
  visible,
  defaultFileName,
  annotationCount,
  pageCount,
  isSaving,
  onSave,
  onClose,
}) => {
  const { themeColors, isDark } = useAppTheme();
  const [fileName, setFileName] = useState<string>('');

  useEffect(() => {
    if (visible) {
      let base = defaultFileName || 'Document';
      if (base.toLowerCase().endsWith('.pdf')) {
        base = base.substring(0, base.length - 4);
      }
      if (!base.endsWith('_edited')) {
        base = `${base}_edited`;
      }
      setFileName(`${base}.pdf`);
    }
  }, [visible, defaultFileName]);

  const handleSave = () => {
    const trimmed = fileName.trim();
    if (!trimmed) return;
    const finalName = trimmed.toLowerCase().endsWith('.pdf') ? trimmed : `${trimmed}.pdf`;
    onSave(finalName);
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={isSaving ? undefined : onClose}
    >
      <TouchableWithoutFeedback onPress={isSaving ? undefined : onClose}>
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
                  <Text style={styles.titleIcon}>💾</Text>
                  <Text style={[styles.title, { color: themeColors.textPrimary }]}>
                    Save Annotated PDF
                  </Text>
                </View>
                {!isSaving && (
                  <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                    <Text style={[styles.closeIcon, { color: themeColors.textMuted }]}>
                      ✕
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
                A new flattened PDF will be created with your annotations permanently embedded. The original file remains untouched.
              </Text>

              {/* Stats badges */}
              <View style={styles.badgeRow}>
                <View style={[styles.badge, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                  <Text style={[styles.badgeLabel, { color: themeColors.textMuted }]}>Annotations:</Text>
                  <Text style={[styles.badgeValue, { color: themeColors.primary }]}>{annotationCount}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                  <Text style={[styles.badgeLabel, { color: themeColors.textMuted }]}>Pages:</Text>
                  <Text style={[styles.badgeValue, { color: themeColors.primary }]}>{pageCount}</Text>
                </View>
              </View>

              {/* Filename Input */}
              <Text style={[styles.inputLabel, { color: themeColors.textPrimary }]}>File Name</Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    color: themeColors.textPrimary,
                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                    borderColor: themeColors.border,
                  },
                ]}
                placeholder="File name"
                placeholderTextColor={themeColors.textMuted}
                value={fileName}
                onChangeText={setFileName}
                editable={!isSaving}
                autoCapitalize="none"
              />

              {/* Actions */}
              <View style={styles.actions}>
                <TouchableOpacity
                  onPress={onClose}
                  disabled={isSaving}
                  style={[
                    styles.cancelBtn,
                    { borderColor: themeColors.border, opacity: isSaving ? 0.5 : 1 },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.cancelBtnText, { color: themeColors.textSecondary }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSave}
                  disabled={isSaving || !fileName.trim()}
                  style={[
                    styles.saveBtn,
                    {
                      backgroundColor: themeColors.primary,
                      opacity: isSaving || !fileName.trim() ? 0.6 : 1,
                    },
                  ]}
                  activeOpacity={0.8}
                >
                  {isSaving ? (
                    <View style={styles.savingRow}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={styles.saveBtnText}>Exporting...</Text>
                    </View>
                  ) : (
                    <Text style={styles.saveBtnText}>Save As Real PDF</Text>
                  )}
                </TouchableOpacity>
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
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 16,
    borderWidth: 1,
    padding: 22,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleIcon: {
    fontSize: 22,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  closeIcon: {
    fontSize: 18,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  badgeValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  textInput: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  saveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  savingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
