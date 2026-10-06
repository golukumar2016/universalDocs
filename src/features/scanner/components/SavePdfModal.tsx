import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useAppTheme } from '../../../shared/hooks';
import { DocumentItem } from '../../../shared/types';
import { ScanPage } from '../types/scanner.types';
import { ScannerService } from '../services/scannerService';
import { PdfGenerationService } from '../services/pdfGenerationService';

export interface SavePdfModalProps {
  visible: boolean;
  pages: ScanPage[];
  onClose: () => void;
  onSuccess: (document: DocumentItem) => void;
}

export const SavePdfModal: React.FC<SavePdfModalProps> = ({
  visible,
  pages,
  onClose,
  onSuccess,
}) => {
  const { themeColors, isDark } = useAppTheme();

  const [fileName, setFileName] = useState<string>(() =>
    ScannerService.generateDefaultFileName()
  );
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string>('');

  const handleSave = async () => {
    const trimmed = fileName.trim();
    if (!trimmed) {
      setErrorText('Please enter a valid document file name.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorText('');
      const { document } = await PdfGenerationService.generateAndSavePdf(
        pages,
        trimmed
      );
      setIsSaving(false);
      onSuccess(document);
    } catch (err: any) {
      setIsSaving(false);
      setErrorText(err?.message || 'Failed to generate PDF document.');
    }
  };

  const estimatedSizeMb = ((pages.length * 280) / 1024).toFixed(1);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: themeColors.card,
              borderColor: themeColors.border,
            },
          ]}
        >
          {/* Header */}
          <Text style={[styles.title, { color: themeColors.textPrimary }]}>
            Save Scanned Document
          </Text>
          <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
            Export your scan as an offline multi-page PDF
          </Text>

          {/* Metadata Overview Box */}
          <View
            style={[
              styles.metaBox,
              {
                backgroundColor: themeColors.cardSecondary,
                borderColor: themeColors.borderLight,
              },
            ]}
          >
            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: themeColors.textSecondary }]}>
                Total Pages:
              </Text>
              <Text style={[styles.metaVal, { color: themeColors.primary }]}>
                {pages.length} {pages.length === 1 ? 'Page' : 'Pages'}
              </Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: themeColors.textSecondary }]}>
                Approx. Size:
              </Text>
              <Text style={[styles.metaVal, { color: themeColors.textPrimary }]}>
                ~{estimatedSizeMb} MB
              </Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: themeColors.textSecondary }]}>
                Offline Storage:
              </Text>
              <Text style={[styles.metaVal, { color: '#10B981', fontWeight: '700' }]}>
                ● 100% Offline
              </Text>
            </View>
          </View>

          {/* Filename Input */}
          <Text style={[styles.inputLabel, { color: themeColors.textPrimary }]}>
            File Name (.pdf):
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: themeColors.cardSecondary,
                borderColor: themeColors.border,
                color: themeColors.textPrimary,
              },
            ]}
            value={fileName}
            onChangeText={txt => {
              setFileName(txt);
              setErrorText('');
            }}
            placeholder="Scanned_Document.pdf"
            placeholderTextColor={themeColors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
          />

          {errorText ? (
            <Text style={styles.errorText}>{errorText}</Text>
          ) : null}

          {/* Button Row */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[
                styles.cancelBtn,
                {
                  backgroundColor: themeColors.cardSecondary,
                  borderColor: themeColors.border,
                },
              ]}
              onPress={onClose}
              disabled={isSaving}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelBtnText, { color: themeColors.textPrimary }]}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.saveBtn,
                { backgroundColor: themeColors.primary },
              ]}
              onPress={handleSave}
              disabled={isSaving}
              activeOpacity={0.8}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveBtnText}>Save & Open PDF →</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 16,
    padding: 22,
    borderWidth: 1,
    elevation: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  metaBox: {
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 6,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  metaVal: {
    fontSize: 12,
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 8,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default SavePdfModal;
