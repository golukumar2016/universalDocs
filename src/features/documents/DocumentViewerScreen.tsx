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
import { colors } from '../../shared/theme';

type DocumentViewerRouteProp = RouteProp<RootStackParamList, 'DocumentViewer'>;

export const DocumentViewerScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<DocumentViewerRouteProp>();

  const { document } = route.params || {};

  const handleBackToHome = () => {
    incomingFileService.clearCurrentDocument();
    navigation.reset({
      index: 0,
      routes: [{ name: 'InitialDocument' }],
    });
  };

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
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>UniversalDocs</Text>
          <Text style={styles.headerBadge}>{extensionUpper} Document Screen</Text>
        </View>

        {/* Main Document Card */}
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Text style={styles.docIcon}>{getFormatIcon(document?.extension)}</Text>
          </View>

          <Text style={styles.docName} numberOfLines={2}>
            {document?.name || 'Document'}
          </Text>

          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>✅ File Received & Identified</Text>
          </View>

          {/* Details Table */}
          <View style={styles.detailsBox}>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Format / Type:</Text>
              <Text style={styles.valueHighlight}>{extensionUpper}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <Text style={styles.label}>MIME Type:</Text>
              <Text style={styles.value} numberOfLines={1}>
                {document?.mimeType || 'unknown'}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <Text style={styles.label}>File Size:</Text>
              <Text style={styles.value}>
                {document?.size ? formatFileSize(document.size) : 'Unknown / Stream'}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <Text style={styles.label}>Document ID:</Text>
              <Text style={styles.valueSmall} numberOfLines={1}>
                {document?.id || 'N/A'}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRowVertical}>
              <Text style={styles.label}>Source URI:</Text>
              <Text style={styles.uriText} numberOfLines={3} selectable>
                {document?.uri || 'N/A'}
              </Text>
            </View>
          </View>

          {/* Viewer Engine Status Box */}
          <View style={styles.engineBox}>
            <Text style={styles.engineTitle}>Viewer Engine Status</Text>
            <Text style={styles.engineStatus}>
              {extensionUpper} Viewer Engine initialized and ready to render in the upcoming step.
            </Text>
          </View>

          {/* Actions */}
          <TouchableOpacity
            style={styles.primaryButton}
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
    backgroundColor: '#0F172A',
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
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  headerBadge: {
    fontSize: 13,
    color: '#38BDF8',
    fontWeight: '600',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  docIcon: {
    fontSize: 52,
  },
  docName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    textAlign: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    backgroundColor: '#064E3B',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#059669',
  },
  statusBadgeText: {
    color: '#34D399',
    fontSize: 12,
    fontWeight: '700',
  },
  detailsBox: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#334155',
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
    backgroundColor: '#1E293B',
    marginVertical: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  value: {
    fontSize: 13,
    fontWeight: '500',
    color: '#F1F5F9',
    textAlign: 'right',
    flex: 1,
    marginLeft: 10,
  },
  valueHighlight: {
    fontSize: 13,
    fontWeight: '700',
    color: '#38BDF8',
    backgroundColor: '#0369A120',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  valueSmall: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'right',
  },
  uriText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
    fontFamily: 'monospace',
  },
  engineBox: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2563EB40',
  },
  engineTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#60A5FA',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  engineStatus: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
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

export default DocumentViewerScreen;
