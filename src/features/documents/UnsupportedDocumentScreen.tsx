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
import { colors } from '../../shared/theme';

type UnsupportedScreenRouteProp = RouteProp<RootStackParamList, 'UnsupportedDocument'>;

export const UnsupportedDocumentScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<UnsupportedScreenRouteProp>();

  const { document, reason } = route.params || {};

  const handleReturnHome = () => {
    incomingFileService.clearCurrentDocument();
    navigation.reset({
      index: 0,
      routes: [{ name: 'InitialDocument' }],
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>UniversalDocs</Text>
          <Text style={styles.headerSubtitle}>Offline Document Manager</Text>
        </View>

        {/* Warning Card */}
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Text style={styles.warningIcon}>⚠️</Text>
          </View>

          <Text style={styles.cardTitle}>Unsupported Document Format</Text>

          <Text style={styles.description}>
            {reason || 'UniversalDocs does not support this file format yet.'}
          </Text>

          {/* File Details */}
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>File Name:</Text>
              <Text style={styles.detailValue} numberOfLines={2}>
                {document?.name || 'Unknown File'}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Extension:</Text>
              <Text style={styles.detailBadge}>
                {document?.extension ? `.${document.extension}` : 'Unknown'}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>MIME Type:</Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {document?.mimeType || 'application/octet-stream'}
              </Text>
            </View>

            {document?.uri && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Location:</Text>
                <Text style={styles.detailValueSmall} numberOfLines={2}>
                  {document.uri}
                </Text>
              </View>
            )}
          </View>

          {/* Supported Formats Info */}
          <View style={styles.supportedFormatsBox}>
            <Text style={styles.supportedFormatsTitle}>Supported Formats:</Text>
            <View style={styles.tagsRow}>
              {['PDF', 'TXT', 'CSV', 'DOC', 'DOCX', 'XLS', 'XLSX', 'PPT', 'PPTX'].map((fmt) => (
                <View key={fmt} style={styles.tag}>
                  <Text style={styles.tagText}>{fmt}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Return Button */}
          <TouchableOpacity
            style={styles.primaryButton}
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
    backgroundColor: '#0F172A', // Dark modern slate
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
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
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
    color: '#F59E0B',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#CBD5E1',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  detailsContainer: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
    width: 85,
  },
  detailValue: {
    flex: 1,
    fontSize: 13,
    color: '#F8FAFC',
    fontWeight: '500',
    textAlign: 'right',
  },
  detailValueSmall: {
    flex: 1,
    fontSize: 11,
    color: '#64748B',
    textAlign: 'right',
  },
  detailBadge: {
    backgroundColor: '#334155',
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  supportedFormatsBox: {
    marginBottom: 24,
  },
  supportedFormatsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#38BDF8',
  },
  primaryButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default UnsupportedDocumentScreen;
