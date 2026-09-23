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
import { useAppTheme } from '../../shared/hooks';

type UnsupportedScreenRouteProp = RouteProp<RootStackParamList, 'UnsupportedDocument'>;

export const UnsupportedDocumentScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<UnsupportedScreenRouteProp>();
  const { themeColors, isDark } = useAppTheme();

  const { document, reason } = route.params || {};

  const handleReturnHome = () => {
    incomingFileService.clearCurrentDocument();
    navigation.reset({
      index: 0,
      routes: [{ name: 'InitialDocument' }],
    });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>
            UniversalDocs
          </Text>
          <Text style={[styles.headerSubtitle, { color: themeColors.textSecondary }]}>
            Offline Document Manager
          </Text>
        </View>

        {/* Warning Card */}
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
            <Text style={styles.warningIcon}>⚠️</Text>
          </View>

          <Text style={[styles.cardTitle, { color: themeColors.warning }]}>
            Unsupported Document Format
          </Text>

          <Text style={[styles.description, { color: themeColors.textSecondary }]}>
            {reason || 'UniversalDocs does not support this file format yet.'}
          </Text>

          {/* File Details */}
          <View
            style={[
              styles.detailsContainer,
              {
                backgroundColor: themeColors.cardSecondary,
                borderColor: themeColors.borderLight,
              },
            ]}
          >
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: themeColors.textSecondary }]}>
                File Name:
              </Text>
              <Text
                style={[styles.detailValue, { color: themeColors.textPrimary }]}
                numberOfLines={2}
              >
                {document?.name || 'Unknown File'}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: themeColors.textSecondary }]}>
                Extension:
              </Text>
              <Text
                style={[
                  styles.detailBadge,
                  {
                    backgroundColor: themeColors.card,
                    borderColor: themeColors.border,
                    color: themeColors.warning,
                  },
                ]}
              >
                {document?.extension ? `.${document.extension}` : 'Unknown'}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: themeColors.textSecondary }]}>
                MIME Type:
              </Text>
              <Text
                style={[styles.detailValue, { color: themeColors.textPrimary }]}
                numberOfLines={1}
              >
                {document?.mimeType || 'application/octet-stream'}
              </Text>
            </View>

            {document?.uri && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: themeColors.textSecondary }]}>
                  Location:
                </Text>
                <Text
                  style={[styles.detailValueSmall, { color: themeColors.textMuted }]}
                  numberOfLines={2}
                >
                  {document.uri}
                </Text>
              </View>
            )}
          </View>

          {/* Supported Formats Info */}
          <View
            style={[
              styles.supportedFormatsBox,
              {
                backgroundColor: themeColors.cardSecondary,
                borderColor: themeColors.borderLight,
              },
            ]}
          >
            <Text
              style={[
                styles.supportedFormatsTitle,
                { color: themeColors.textSecondary },
              ]}
            >
              Supported Formats:
            </Text>
            <View style={styles.tagsRow}>
              {['PDF', 'TXT', 'CSV', 'DOC', 'DOCX', 'XLS', 'XLSX', 'PPT', 'PPTX'].map(
                (fmt) => (
                  <View
                    key={fmt}
                    style={[
                      styles.tag,
                      {
                        backgroundColor: themeColors.card,
                        borderColor: themeColors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.tagText, { color: themeColors.primary }]}
                    >
                      {fmt}
                    </Text>
                  </View>
                )
              )}
            </View>
          </View>

          {/* Return Button */}
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: themeColors.primary }]}
            onPress={handleReturnHome}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Return to UniversalDocs</Text>
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
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 4,
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
  warningIcon: {
    fontSize: 48,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  detailsContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
    marginLeft: 10,
  },
  detailBadge: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  detailValueSmall: {
    fontSize: 11,
    flex: 1,
    textAlign: 'right',
    marginLeft: 10,
  },
  supportedFormatsBox: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    borderWidth: 1,
  },
  supportedFormatsTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  primaryButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default UnsupportedDocumentScreen;
