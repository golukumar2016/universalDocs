import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../app/navigation/navigation.types';
import { incomingFileService } from '../../core/intents/incomingFileService';
import { formatFileSize } from '../../shared/utils';
import { useAppTheme } from '../../shared/hooks';
import { PdfViewer } from './pdf';

type DocumentViewerRouteProp = RouteProp<RootStackParamList, 'DocumentViewer'>;

export const DocumentViewerScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<DocumentViewerRouteProp>();
  const { themeColors, isDark } = useAppTheme();

  const { document } = route.params || {};

  const handleBackToHome = () => {
    incomingFileService.clearCurrentDocument();
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.reset({
        index: 0,
        routes: [{ name: 'InitialDocument' }],
      });
    }
  };

  const isPdf = (document?.extension || '').toLowerCase() === 'pdf';

  if (isPdf && document?.uri) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
        <PdfViewer document={document} onBack={handleBackToHome} />
      </SafeAreaView>
    );
  }

  const getFormatIcon = (ext?: string) => {
    switch ((ext || '').toLowerCase()) {
      case 'pdf':
        return '📕';
      case 'txt':
      case 'text':
      case 'md':
        return '📝';
      case 'doc':
      case 'docx':
        return '📘';
      case 'xls':
      case 'xlsx':
      case 'csv':
        return '📊';
      case 'ppt':
      case 'pptx':
        return '📙';
      default:
        return '📄';
    }
  };

  const extensionUpper = (document?.extension || 'DOC').toUpperCase();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>
            UniversalDocs
          </Text>
          <Text
            style={[
              styles.headerBadge,
              {
                color: themeColors.primary,
                backgroundColor: themeColors.badgeBg,
                borderColor: themeColors.border,
              },
            ]}
          >
            {extensionUpper} Document Screen
          </Text>
        </View>

        {/* Main Document Card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: themeColors.card,
              borderColor: themeColors.border,
            },
          ]}
        >
          <View style={styles.iconContainer}>
            <Text style={styles.docIcon}>{getFormatIcon(document?.extension)}</Text>
          </View>

          <Text
            style={[styles.docName, { color: themeColors.textPrimary }]}
            numberOfLines={2}
          >
            {document?.name || 'Document'}
          </Text>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: isDark ? '#064E3B' : '#DCFCE7',
                borderColor: isDark ? '#059669' : '#86EFAC',
              },
            ]}
          >
            <Text
              style={[
                styles.statusBadgeText,
                { color: isDark ? '#34D399' : '#15803D' },
              ]}
            >
              ✅ File Received & Identified
            </Text>
          </View>

          {/* Details Table */}
          <View
            style={[
              styles.detailsBox,
              {
                backgroundColor: themeColors.cardSecondary,
                borderColor: themeColors.borderLight,
              },
            ]}
          >
            <View style={styles.detailRow}>
              <Text style={[styles.label, { color: themeColors.textSecondary }]}>
                Format / Type:
              </Text>
              <Text style={[styles.valueHighlight, { color: themeColors.primary }]}>
                {extensionUpper}
              </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: themeColors.divider }]} />

            <View style={styles.detailRow}>
              <Text style={[styles.label, { color: themeColors.textSecondary }]}>
                MIME Type:
              </Text>
              <Text
                style={[styles.value, { color: themeColors.textPrimary }]}
                numberOfLines={1}
              >
                {document?.mimeType || 'unknown'}
              </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: themeColors.divider }]} />

            <View style={styles.detailRow}>
              <Text style={[styles.label, { color: themeColors.textSecondary }]}>
                File Size:
              </Text>
              <Text style={[styles.value, { color: themeColors.textPrimary }]}>
                {document?.size ? formatFileSize(document.size) : 'Unknown / Stream'}
              </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: themeColors.divider }]} />

            <View style={styles.detailRow}>
              <Text style={[styles.label, { color: themeColors.textSecondary }]}>
                Document ID:
              </Text>
              <Text
                style={[styles.valueSmall, { color: themeColors.textMuted }]}
                numberOfLines={1}
              >
                {document?.id || 'N/A'}
              </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: themeColors.divider }]} />

            <View style={styles.detailRowVertical}>
              <Text style={[styles.label, { color: themeColors.textSecondary }]}>
                Source URI:
              </Text>
              <Text
                style={[styles.uriText, { color: themeColors.textMuted }]}
                numberOfLines={3}
                selectable
              >
                {document?.uri || 'N/A'}
              </Text>
            </View>
          </View>

          {/* Viewer Engine Status Box */}
          <View
            style={[
              styles.engineBox,
              {
                backgroundColor: themeColors.cardSecondary,
                borderColor: themeColors.borderLight,
              },
            ]}
          >
            <Text style={[styles.engineTitle, { color: themeColors.textPrimary }]}>
              Viewer Engine Status
            </Text>
            <Text style={[styles.engineStatus, { color: themeColors.textSecondary }]}>
              {extensionUpper} Viewer Engine initialized and ready to render in the upcoming step.
            </Text>
          </View>

          {/* Actions */}
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: themeColors.primary }]}
            onPress={handleBackToHome}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Open Another Document</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerBadge: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  docIcon: {
    fontSize: 52,
  },
  docName: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: 20,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  detailsBox: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  detailRowVertical: {
    paddingVertical: 6,
  },
  divider: {
    height: 1,
    marginVertical: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  value: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'right',
    flex: 1,
    marginLeft: 10,
  },
  valueHighlight: {
    fontSize: 14,
    fontWeight: '700',
  },
  valueSmall: {
    fontSize: 11,
    textAlign: 'right',
    flex: 1,
    marginLeft: 10,
  },
  uriText: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
    fontFamily: 'monospace',
  },
  engineBox: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
  },
  engineTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  engineStatus: {
    fontSize: 12,
    lineHeight: 18,
  },
  primaryButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default DocumentViewerScreen;
