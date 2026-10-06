import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useAppTheme } from '../../../../shared/hooks';
import { formatFileSize, formatDate } from '../../../../shared/utils';

export interface PdfInfoModalProps {
  visible: boolean;
  documentName: string;
  pageCount: number;
  fileSize?: number;
  mimeType?: string;
  uri?: string;
  modifiedAt?: number;
  onClose: () => void;
}

export const PdfInfoModal: React.FC<PdfInfoModalProps> = ({
  visible,
  documentName,
  pageCount,
  fileSize,
  mimeType,
  uri,
  modifiedAt,
  onClose,
}) => {
  const { themeColors } = useAppTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: themeColors.card,
              borderColor: themeColors.border,
            },
          ]}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: themeColors.textPrimary }]}>
              Document Information
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[styles.closeIcon, { color: themeColors.textMuted }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            <View
              style={[
                styles.detailsBox,
                {
                  backgroundColor: themeColors.cardSecondary,
                  borderColor: themeColors.borderLight,
                },
              ]}
            >
              {/* File Name */}
              <View style={styles.row}>
                <Text style={[styles.label, { color: themeColors.textSecondary }]}>
                  File Name
                </Text>
                <Text
                  style={[styles.value, { color: themeColors.textPrimary }]}
                  numberOfLines={2}
                >
                  {documentName}
                </Text>
              </View>

              <View style={[styles.divider, { backgroundColor: themeColors.divider }]} />

              {/* Total Pages */}
              <View style={styles.row}>
                <Text style={[styles.label, { color: themeColors.textSecondary }]}>
                  Total Pages
                </Text>
                <Text style={[styles.valueHighlight, { color: themeColors.primary }]}>
                  {pageCount} {pageCount === 1 ? 'page' : 'pages'}
                </Text>
              </View>

              <View style={[styles.divider, { backgroundColor: themeColors.divider }]} />

              {/* File Size */}
              <View style={styles.row}>
                <Text style={[styles.label, { color: themeColors.textSecondary }]}>
                  File Size
                </Text>
                <Text style={[styles.value, { color: themeColors.textPrimary }]}>
                  {fileSize !== undefined && fileSize > 0
                    ? formatFileSize(fileSize)
                    : 'System Managed'}
                </Text>
              </View>

              <View style={[styles.divider, { backgroundColor: themeColors.divider }]} />

              {/* MIME Type */}
              <View style={styles.row}>
                <Text style={[styles.label, { color: themeColors.textSecondary }]}>
                  Format
                </Text>
                <Text style={[styles.value, { color: themeColors.textPrimary }]}>
                  {mimeType || 'application/pdf'} (PDF)
                </Text>
              </View>

              {modifiedAt ? (
                <>
                  <View style={[styles.divider, { backgroundColor: themeColors.divider }]} />
                  <View style={styles.row}>
                    <Text style={[styles.label, { color: themeColors.textSecondary }]}>
                      Last Modified
                    </Text>
                    <Text style={[styles.value, { color: themeColors.textPrimary }]}>
                      {formatDate(modifiedAt)}
                    </Text>
                  </View>
                </>
              ) : null}

              {/* Offline Security Status */}
              <View style={[styles.divider, { backgroundColor: themeColors.divider }]} />
              <View style={styles.row}>
                <Text style={[styles.label, { color: themeColors.textSecondary }]}>
                  Offline Status
                </Text>
                <Text style={[styles.value, { color: '#10B981', fontWeight: '700' }]}>
                  ● 100% Offline (Local Storage)
                </Text>
              </View>

              {/* URI / Source */}
              {uri ? (
                <>
                  <View style={[styles.divider, { backgroundColor: themeColors.divider }]} />
                  <View style={styles.col}>
                    <Text style={[styles.label, { color: themeColors.textSecondary, marginBottom: 4 }]}>
                      Source URI
                    </Text>
                    <Text
                      style={[styles.uriValue, { color: themeColors.textMuted }]}
                      numberOfLines={3}
                      selectable
                    >
                      {uri}
                    </Text>
                  </View>
                </>
              ) : null}
            </View>
          </ScrollView>

          <TouchableOpacity
            style={[styles.closeBtn, { backgroundColor: themeColors.primary }]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.closeBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '80%',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeIcon: {
    fontSize: 18,
    fontWeight: '700',
    padding: 4,
  },
  scroll: {
    marginBottom: 16,
  },
  detailsBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  col: {
    paddingVertical: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
  value: {
    fontSize: 13,
    fontWeight: '600',
    maxWidth: '65%',
    textAlign: 'right',
  },
  valueHighlight: {
    fontSize: 13,
    fontWeight: '700',
  },
  uriValue: {
    fontSize: 11,
    lineHeight: 16,
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  closeBtn: {
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default PdfInfoModal;
