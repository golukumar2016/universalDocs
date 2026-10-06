import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAppTheme } from '../../../../shared/hooks';
import { PdfService } from '../pdfService';

export interface PdfJumpModalProps {
  visible: boolean;
  currentPage: number;
  pageCount: number;
  onClose: () => void;
  onJump: (pageNumber: number) => void;
}

export const PdfJumpModal: React.FC<PdfJumpModalProps> = ({
  visible,
  currentPage,
  pageCount,
  onClose,
  onJump,
}) => {
  const { themeColors, isDark } = useAppTheme();
  const [inputVal, setInputVal] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (visible) {
      setInputVal(String(currentPage));
      setErrorMsg('');
    }
  }, [visible, currentPage]);

  const handleSubmit = () => {
    const result = PdfService.validatePageJump(inputVal, pageCount);
    if (!result.valid || !result.pageNumber) {
      setErrorMsg(result.error || 'Invalid page number.');
      return;
    }

    setErrorMsg('');
    onJump(result.pageNumber);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View
          style={[
            styles.card,
            {
              backgroundColor: themeColors.card,
              borderColor: themeColors.border,
            },
          ]}
        >
          <Text style={[styles.title, { color: themeColors.textPrimary }]}>
            Jump to Page
          </Text>
          <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
            Enter page number between 1 and {pageCount}
          </Text>

          <View style={styles.inputRow}>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: themeColors.inputBackground,
                  borderColor: errorMsg ? themeColors.error : themeColors.border,
                  color: themeColors.textPrimary,
                },
              ]}
              keyboardType="number-pad"
              autoFocus
              selectTextOnFocus
              maxLength={5}
              value={inputVal}
              onChangeText={(txt) => {
                setInputVal(txt);
                if (errorMsg) setErrorMsg('');
              }}
              onSubmitEditing={handleSubmit}
              returnKeyType="go"
            />
            <Text style={[styles.pageTotal, { color: themeColors.textSecondary }]}>
              / {pageCount}
            </Text>
          </View>

          {errorMsg ? (
            <Text style={[styles.errorText, { color: themeColors.error }]}>
              {errorMsg}
            </Text>
          ) : null}

          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[
                styles.btn,
                {
                  backgroundColor: themeColors.cardSecondary,
                  borderColor: themeColors.border,
                  borderWidth: 1,
                },
              ]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.btnText, { color: themeColors.textSecondary }]}
              >
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, { backgroundColor: themeColors.primary }]}
              onPress={handleSubmit}
              activeOpacity={0.8}
            >
              <Text style={[styles.btnText, { color: '#FFFFFF' }]}>
                Jump
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  input: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  pageTotal: {
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 12,
    marginTop: 8,
    fontWeight: '600',
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
  },
  btn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  btnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});

export default PdfJumpModal;
