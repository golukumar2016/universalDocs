import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useNavigation, useIsFocused, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../app/navigation/navigation.types';
import { DocumentRepository } from '../../core/database/repositories/documentRepository';
import { RecentRepository } from '../../core/database/repositories/recentRepository';
import { DocumentService } from '../../core/filesystem/documentService';
import { DocumentItem } from '../../shared/types';
import { formatFileSize, formatDate } from '../../shared/utils';
import { colors } from '../../shared/theme';

export const DocumentsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [recentDocs, setRecentDocs] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // New file modal state
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [newFileName, setNewFileName] = useState<string>('');
  const [selectedExtension, setSelectedExtension] = useState<string>('txt');

  const loadData = useCallback(async () => {
    try {
      const [allDocs, recents] = await Promise.all([
        DocumentRepository.findByFolder(null),
        RecentRepository.getRecentDocuments(5),
      ]);
      setDocuments(allDocs);
      setRecentDocs(recents);
    } catch (error: any) {
      console.error('Error loading documents:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isFocused) {
      loadData();
    }
  }, [isFocused, loadData]);

  // Import document from device
  const handlePickDocument = async () => {
    try {
      const importedDoc = await DocumentService.pickAndImportDocument();
      if (importedDoc) {
        await loadData();
        navigation.navigate('Editor', {
          documentId: importedDoc.id,
          filePath: importedDoc.path,
          title: importedDoc.name,
        });
      }
    } catch (error: any) {
      Alert.alert('Import Failed', error?.message || 'Failed to import document.');
    }
  };

  // Create a brand new document
  const handleCreateNewDocument = async () => {
    const trimmed = newFileName.trim();
    if (!trimmed) {
      Alert.alert('Validation', 'Please provide a file name.');
      return;
    }

    try {
      const newDoc = await DocumentService.createNewDocument(
        trimmed,
        selectedExtension,
        ''
      );
      setIsModalVisible(false);
      setNewFileName('');
      await loadData();

      navigation.navigate('Editor', {
        documentId: newDoc.id,
        filePath: newDoc.path,
        title: newDoc.name,
      });
    } catch (error: any) {
      Alert.alert('Creation Failed', error?.message || 'Could not create document.');
    }
  };

  // Delete document
  const handleDeleteDocument = (doc: DocumentItem) => {
    Alert.alert(
      'Delete Document',
      `Are you sure you want to delete "${doc.name}" locally?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await DocumentService.deleteDocument(doc);
              await loadData();
            } catch (error: any) {
              Alert.alert('Delete Failed', error?.message || 'Failed to delete file.');
            }
          },
        },
      ]
    );
  };

  // Toggle favorite
  const handleToggleFavorite = async (doc: DocumentItem) => {
    try {
      await DocumentService.toggleFavorite(doc);
      await loadData();
    } catch (error: any) {
      console.error('Favorite toggle failed:', error);
    }
  };

  // Open in editor
  const handleOpenDoc = (doc: DocumentItem) => {
    navigation.navigate('Editor', {
      documentId: doc.id,
      filePath: doc.path,
      title: doc.name,
    });
  };

  const renderDocumentItem = ({ item }: { item: DocumentItem }) => {
    const badgeColor =
      item.extension === 'pdf'
        ? '#EF4444'
        : item.extension === 'docx' || item.extension === 'doc'
        ? '#2563EB'
        : item.extension === 'xlsx' || item.extension === 'xls'
        ? '#10B981'
        : '#64748B';

    return (
      <TouchableOpacity
        style={styles.docCard}
        onPress={() => handleOpenDoc(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.extBadge, { backgroundColor: badgeColor }]}>
          <Text style={styles.extBadgeText}>{item.extension.toUpperCase()}</Text>
        </View>

        <View style={styles.docInfo}>
          <Text style={styles.docName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.docMeta}>
            {formatFileSize(item.size)} • {formatDate(item.updatedAt)}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => handleToggleFavorite(item)}
        >
          <Text style={styles.actionIcon}>{item.isFavorite ? '★' : '☆'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => handleDeleteDocument(item)}
        >
          <Text style={[styles.actionIcon, { color: colors.error }]}>✕</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerContainer}>
        <View>
          <Text style={styles.headerTitle}>UniversalDocs</Text>
          <Text style={styles.headerSubtitle}>Offline Document Workspace</Text>
        </View>
        <View style={styles.offlineBadge}>
          <Text style={styles.offlineBadgeText}>⚡ Offline Ready</Text>
        </View>
      </View>

      {/* Action Bar */}
      <View style={styles.actionsBar}>
        <TouchableOpacity
          style={[styles.primaryActionBtn, { backgroundColor: colors.primary }]}
          onPress={handlePickDocument}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryActionText}>📂 Open from Device</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryActionBtn, { backgroundColor: '#334155' }]}
          onPress={() => setIsModalVisible(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryActionText}>+ New File</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Section (if any) */}
      {recentDocs.length > 0 && (
        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>Recently Opened</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {recentDocs.map((doc) => (
              <TouchableOpacity
                key={doc.id}
                style={styles.recentPill}
                onPress={() => handleOpenDoc(doc)}
              >
                <Text style={styles.recentExt}>{doc.extension.toUpperCase()}</Text>
                <Text style={styles.recentName} numberOfLines={1}>
                  {doc.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Main Document List */}
      <View style={styles.listContainer}>
        <Text style={styles.sectionTitle}>Local Documents ({documents.length})</Text>

        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={documents}
            keyExtractor={(item) => item.id}
            renderItem={renderDocumentItem}
            contentContainerStyle={documents.length === 0 ? styles.emptyContainer : undefined}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => {
                  setIsRefreshing(true);
                  loadData();
                }}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContent}>
                <Text style={styles.emptyTitle}>No documents yet</Text>
                <Text style={styles.emptySubtitle}>
                  Import files from your device or create a new text file to begin.
                </Text>
              </View>
            }
          />
        )}
      </View>

      {/* Create New File Modal */}
      <Modal visible={isModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Document</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="e.g. MeetingNotes, Ideas"
              placeholderTextColor="#94A3B8"
              value={newFileName}
              onChangeText={setNewFileName}
              autoFocus
            />

            <View style={styles.extPickerRow}>
              {['txt', 'md', 'json', 'csv'].map((ext) => (
                <TouchableOpacity
                  key={ext}
                  style={[
                    styles.extOption,
                    selectedExtension === ext && styles.extOptionSelected,
                  ]}
                  onPress={() => setSelectedExtension(ext)}
                >
                  <Text
                    style={[
                      styles.extOptionText,
                      selectedExtension === ext && styles.extOptionTextSelected,
                    ]}
                  >
                    .{ext}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => {
                  setIsModalVisible(false);
                  setNewFileName('');
                }}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnConfirm]}
                onPress={handleCreateNewDocument}
              >
                <Text style={styles.modalBtnConfirmText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  offlineBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  offlineBadgeText: {
    color: '#15803D',
    fontSize: 12,
    fontWeight: '600',
  },
  actionsBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  primaryActionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  recentSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  recentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 10,
    maxWidth: 160,
  },
  recentExt: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
  },
  recentName: {
    fontSize: 13,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  extBadge: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  extBadgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11,
  },
  docInfo: {
    flex: 1,
  },
  docName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  docMeta: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  actionBtn: {
    padding: 8,
    marginLeft: 4,
  },
  actionIcon: {
    fontSize: 18,
    color: '#F59E0B',
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyContent: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    marginBottom: 16,
    color: colors.textPrimary,
  },
  extPickerRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  extOption: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  extOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  extOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  extOptionTextSelected: {
    color: '#FFFFFF',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalBtnCancel: {
    backgroundColor: '#F1F5F9',
  },
  modalBtnCancelText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  modalBtnConfirm: {
    backgroundColor: colors.primary,
  },
  modalBtnConfirmText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default DocumentsScreen;
