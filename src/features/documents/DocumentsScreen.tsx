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
import { useAppTheme } from '../../shared/hooks';

export const DocumentsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();
  const { themeColors, isDark } = useAppTheme();

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
        style={[
          styles.docCard,
          {
            backgroundColor: themeColors.card,
            borderColor: themeColors.border,
          },
        ]}
        onPress={() => handleOpenDoc(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.extBadge, { backgroundColor: badgeColor }]}>
          <Text style={styles.extBadgeText}>{item.extension.toUpperCase()}</Text>
        </View>

        <View style={styles.docInfo}>
          <Text
            style={[styles.docName, { color: themeColors.textPrimary }]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <Text style={[styles.docMeta, { color: themeColors.textMuted }]}>
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
          <Text style={[styles.actionIcon, { color: themeColors.error }]}>🗑</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      {/* Top Header */}
      <View
        style={[
          styles.headerContainer,
          {
            backgroundColor: themeColors.surface,
            borderBottomColor: themeColors.border,
            borderBottomWidth: 1,
          },
        ]}
      >
        <View>
          <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>
            My Documents
          </Text>
          <Text style={[styles.headerSubtitle, { color: themeColors.textSecondary }]}>
            Offline SQLite storage
          </Text>
        </View>
        <View
          style={[
            styles.offlineBadge,
            {
              backgroundColor: isDark ? '#064E3B' : '#DCFCE7',
            },
          ]}
        >
          <Text
            style={[
              styles.offlineBadgeText,
              { color: isDark ? '#34D399' : '#15803D' },
            ]}
          >
            ⚡ Offline Ready
          </Text>
        </View>
      </View>

      {/* Action Bar */}
      <View style={styles.actionsBar}>
        <TouchableOpacity
          style={[styles.primaryActionBtn, { backgroundColor: themeColors.primary }]}
          onPress={handlePickDocument}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryActionText}>📂 Open from Device</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.primaryActionBtn,
            { backgroundColor: themeColors.cardSecondary, borderWidth: 1, borderColor: themeColors.border },
          ]}
          onPress={() => setIsModalVisible(true)}
          activeOpacity={0.8}
        >
          <Text style={[styles.primaryActionText, { color: themeColors.textPrimary }]}>
            + New File
          </Text>
        </TouchableOpacity>
      </View>

      {/* Recent Section (if any) */}
      {recentDocs.length > 0 && (
        <View style={styles.recentSection}>
          <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
            Recently Opened
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {recentDocs.map((doc) => (
              <TouchableOpacity
                key={doc.id}
                style={[
                  styles.recentPill,
                  {
                    backgroundColor: themeColors.card,
                    borderColor: themeColors.border,
                  },
                ]}
                onPress={() => handleOpenDoc(doc)}
              >
                <Text style={styles.recentExt}>{doc.extension.toUpperCase()}</Text>
                <Text
                  style={[styles.recentName, { color: themeColors.textPrimary }]}
                  numberOfLines={1}
                >
                  {doc.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Main Document List */}
      <View style={styles.listContainer}>
        <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
          Local Documents ({documents.length})
        </Text>

        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={themeColors.primary} />
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
                tintColor={themeColors.primary}
                onRefresh={() => {
                  setIsRefreshing(true);
                  loadData();
                }}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContent}>
                <Text style={[styles.emptyTitle, { color: themeColors.textPrimary }]}>
                  No documents yet
                </Text>
                <Text style={[styles.emptySubtitle, { color: themeColors.textSecondary }]}>
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
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: themeColors.surface,
                borderColor: themeColors.border,
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>
              Create New Document
            </Text>

            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: themeColors.inputBackground,
                  borderColor: themeColors.border,
                  color: themeColors.textPrimary,
                },
              ]}
              placeholder="e.g. MeetingNotes, Ideas"
              placeholderTextColor={themeColors.textMuted}
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
                    {
                      backgroundColor: themeColors.cardSecondary,
                      borderColor: themeColors.border,
                    },
                    selectedExtension === ext && {
                      backgroundColor: themeColors.primary,
                      borderColor: themeColors.primary,
                    },
                  ]}
                  onPress={() => setSelectedExtension(ext)}
                >
                  <Text
                    style={[
                      styles.extOptionText,
                      { color: themeColors.textSecondary },
                      selectedExtension === ext && { color: '#FFFFFF', fontWeight: '700' },
                    ]}
                  >
                    .{ext}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: themeColors.cardSecondary }]}
                onPress={() => {
                  setIsModalVisible(false);
                  setNewFileName('');
                }}
              >
                <Text style={[styles.modalBtnCancelText, { color: themeColors.textSecondary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: themeColors.primary }]}
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
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  offlineBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  offlineBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionsBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
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
    marginBottom: 10,
  },
  recentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 10,
    maxWidth: 160,
  },
  recentExt: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563EB',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
  },
  recentName: {
    fontSize: 13,
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
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
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
  },
  docMeta: {
    fontSize: 12,
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
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    marginBottom: 16,
  },
  extPickerRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  extOption: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1,
  },
  extOptionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalBtnCancelText: {
    fontWeight: '600',
    fontSize: 14,
  },
  modalBtnConfirmText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default DocumentsScreen;
